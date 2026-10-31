import json
import logging
import os
import time
import urllib.request
from typing import Dict, List, Optional, Tuple

import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np
import onnxruntime as ort

from .dsp import (
    compute_hrv_rmssd,
    compute_inter_region_coherence,
    compute_pos_wave,
    compute_snr_sqi,
    compute_welch_bpm,
)
from .schemas import ROIBox

logger = logging.getLogger("physioguard.inference")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")
ONNX_MODEL_PATH = os.path.join(MODELS_DIR, "physioguard_best.onnx")
METRICS_JSON_PATH = os.path.join(MODELS_DIR, "metrics_summary.json")
LANDMARKER_MODEL_PATH = os.path.join(MODELS_DIR, "face_landmarker.task")
LANDMARKER_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
)

# Tightened Eyeglass-Safe Landmark Indices
FOREHEAD_LMS = [10, 67, 109, 338, 297, 151]
LEFT_MALAR_LMS = [117, 118, 101, 50, 205]
RIGHT_MALAR_LMS = [346, 347, 330, 280, 425]


class FaceProcessor:
    """Detects 468 facial landmarks and extracts vascular anatomical crops."""

    def __init__(self, model_path: str = LANDMARKER_MODEL_PATH):
        self.model_path = model_path
        self._ensure_model_exists()
        base_options = python.BaseOptions(model_asset_path=self.model_path)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False,
            num_faces=1,
        )
        self.detector = vision.FaceLandmarker.create_from_options(options)
        self.last_valid_rois: Optional[Dict[str, Tuple[int, int, int, int]]] = None

    def _ensure_model_exists(self):
        if not os.path.exists(self.model_path):
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            logger.info("Downloading face_landmarker.task from %s...", LANDMARKER_URL)
            urllib.request.urlretrieve(LANDMARKER_URL, self.model_path)
            logger.info("Downloaded face_landmarker.task (%d bytes)", os.path.getsize(self.model_path))

    def _get_bbox(
        self, landmarks, indices: List[int], w: int, h: int, pad: int = 2
    ) -> Tuple[int, int, int, int]:
        xs = [landmarks[idx].x * w for idx in indices if idx < len(landmarks)]
        ys = [landmarks[idx].y * h for idx in indices if idx < len(landmarks)]
        if not xs or not ys:
            return 0, 0, w, h
        x1 = max(0, int(min(xs)) - pad)
        x2 = min(w, int(max(xs)) + pad)
        y1 = max(0, int(min(ys)) - pad)
        y2 = min(h, int(max(ys)) + pad)
        if x2 <= x1:
            x2 = min(w, x1 + 10)
        if y2 <= y1:
            y2 = min(h, y1 + 10)
        return x1, y1, x2, y2

    def process_frame(
        self, frame_rgb: np.ndarray
    ) -> Tuple[bool, np.ndarray, np.ndarray, np.ndarray, List[ROIBox]]:
        """Processes a single RGB frame (uint8, HxWx3).
        
        Resizes incoming frame to 480x360 for accelerated MediaPipe landmark detection.
        """
        if frame_rgb.shape[1] != 480 or frame_rgb.shape[0] != 360:
            frame_rgb = cv2.resize(frame_rgb, (480, 360), interpolation=cv2.INTER_LINEAR)

        h, w, _ = frame_rgb.shape

        # Ambient background ROI: top-left corner
        bg_h = max(16, h // 10)
        bg_w = max(16, w // 10)
        bg_crop = frame_rgb[:bg_h, :bg_w]
        bg_rgb = np.mean(bg_crop, axis=(0, 1)).astype(np.float32)

        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
        detection_result = self.detector.detect(mp_image)

        face_detected = len(detection_result.face_landmarks) > 0
        hud_rois: List[ROIBox] = []

        if not face_detected:
            # Strict occlusion gate: reset any cached ROIs and immediately return empty structures
            self.last_valid_rois = None
            stacked = np.zeros((72, 72, 3), dtype=np.float32)
            skin_rgbs = np.zeros((3, 3), dtype=np.float32)
            return False, stacked, skin_rgbs, bg_rgb, []

        lms = detection_result.face_landmarks[0]
        # 2px padding prevents eyeglasses from entering skin patches
        box_fh = self._get_bbox(lms, FOREHEAD_LMS, w, h, pad=2)
        box_lm = self._get_bbox(lms, LEFT_MALAR_LMS, w, h, pad=2)
        box_rm = self._get_bbox(lms, RIGHT_MALAR_LMS, w, h, pad=2)
        self.last_valid_rois = {
            "forehead": box_fh,
            "left_malar": box_lm,
            "right_malar": box_rm,
        }

        def crop_and_resize(box):
            x1, y1, x2, y2 = box
            c = frame_rgb[y1:y2, x1:x2]
            if c.size == 0:
                c = np.zeros((24, 72, 3), dtype=np.uint8)
            else:
                c = cv2.resize(c, (72, 24), interpolation=cv2.INTER_AREA)
            mean_rgb = np.mean(c, axis=(0, 1)).astype(np.float32)
            return c, mean_rgb

        crop_fh, rgb_fh = crop_and_resize(box_fh)
        crop_lm, rgb_lm = crop_and_resize(box_lm)
        crop_rm, rgb_rm = crop_and_resize(box_rm)

        stacked = np.vstack([crop_fh, crop_lm, crop_rm]).astype(np.float32)
        skin_rgbs = np.stack([rgb_fh, rgb_lm, rgb_rm], axis=0).astype(np.float32)

        hud_rois.append(ROIBox(name="forehead", x1=box_fh[0] / w, y1=box_fh[1] / h, x2=box_fh[2] / w, y2=box_fh[3] / h))
        hud_rois.append(ROIBox(name="left_malar", x1=box_lm[0] / w, y1=box_lm[1] / h, x2=box_lm[2] / w, y2=box_lm[3] / h))
        hud_rois.append(ROIBox(name="right_malar", x1=box_rm[0] / w, y1=box_rm[1] / h, x2=box_rm[2] / w, y2=box_rm[3] / h))
        hud_rois.append(ROIBox(name="ambient_bg", x1=0.0, y1=0.0, x2=bg_w / w, y2=bg_h / h))

        return face_detected, stacked, skin_rgbs, bg_rgb, hud_rois


class PhysioGuardInference:
    """Manages the trained PhysioGuardNet ONNX inference graph and telemetry extraction."""

    def __init__(self, onnx_path: str = ONNX_MODEL_PATH, metrics_path: str = METRICS_JSON_PATH):
        self.onnx_path = onnx_path
        self.metrics_path = metrics_path
        self.session: Optional[ort.InferenceSession] = None
        self.optimal_threshold: float = 0.50
        self.metrics_data: dict = {}
        self.load_model()

    def load_model(self):
        if not os.path.exists(self.onnx_path):
            raise FileNotFoundError(f"Trained ONNX model not found at {self.onnx_path}")

        opts = ort.SessionOptions()
        opts.intra_op_num_threads = os.cpu_count() or 4
        opts.inter_op_num_threads = 1
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        self.session = ort.InferenceSession(
            self.onnx_path, sess_options=opts, providers=["CPUExecutionProvider"]
        )

        if os.path.exists(self.metrics_path):
            try:
                with open(self.metrics_path, "r", encoding="utf-8") as f:
                    self.metrics_data = json.load(f)
                    self.optimal_threshold = float(
                        self.metrics_data.get("optimal_liveness_threshold", 0.6258)
                    )
                    logger.info("Loaded optimal liveness threshold: %.4f", self.optimal_threshold)
            except Exception as e:
                logger.warning("Failed to parse metrics_summary.json: %s", e)
                self.optimal_threshold = 0.50

    def prepare_st_vol(self, frames_128: np.ndarray) -> np.ndarray:
        frames = np.asarray(frames_128, dtype=np.float32)

        diff = np.zeros_like(frames, dtype=np.float32)
        diff[:-1] = (frames[1:] - frames[:-1]) / (frames[1:] + frames[:-1] + 1e-5)
        diff[-1] = diff[-2]
        diff_std = np.std(diff)
        diff = np.clip(diff / (diff_std + 1e-6), -3.0, 3.0)

        mean_app = np.mean(frames, axis=(0, 1, 2), keepdims=True)
        std_app = np.std(frames) + 1e-6
        app = (frames - mean_app) / std_app

        st_vol = np.concatenate([diff, app], axis=-1)
        st_vol = np.transpose(st_vol, (3, 0, 1, 2))
        return np.expand_dims(st_vol, axis=0).astype(np.float32)

    def prepare_reg_pos(
        self, regional_skin_rgb: np.ndarray, bg_rgb: np.ndarray
    ) -> np.ndarray:
        pos_waves = []
        for r in range(3):
            wave = compute_pos_wave(regional_skin_rgb[r], bg_rgb, fs=30.0)
            pos_waves.append(wave)

        reg_pos = np.stack(pos_waves, axis=0)
        return np.expand_dims(reg_pos, axis=0).astype(np.float32)

    def predict(
        self,
        frames_128: np.ndarray,
        regional_skin_rgb: np.ndarray,
        bg_rgb: np.ndarray,
        threshold_override: Optional[float] = None,
        effective_fps: float = 30.0,
    ) -> dict:
        """Runs end-to-end PhysioGuard inference and returns biometric telemetry."""
        if self.session is None:
            self.load_model()

        threshold = threshold_override if threshold_override is not None else self.optimal_threshold

        t0 = time.perf_counter()
        st_vol = self.prepare_st_vol(frames_128)
        reg_pos = self.prepare_reg_pos(regional_skin_rgb, bg_rgb)

        outputs = self.session.run(
            ["pred_bvp", "live_logits"],
            {"st_vol": st_vol, "reg_pos": reg_pos},
        )
        latency_ms = round((time.perf_counter() - t0) * 1000.0, 2)

        pred_bvp = outputs[0][0]
        live_logits = outputs[1][0, 0]

        auth_score = float(1.0 / (1.0 + np.exp(-live_logits)))
        auth_score = round(float(np.clip(auth_score, 0.0001, 0.9999)), 4)
        is_human = auth_score >= threshold
        verdict = "BIOLOGICAL HUMAN" if is_human else "SYNTHETIC SPOOF"

        # Welch PSD and SNR
        hr_bpm, psd_freqs, psd_powers = compute_welch_bpm(pred_bvp, fs=30.0)
        sqi_pct, snr_db = compute_snr_sqi(pred_bvp, fs=30.0)

        # SQI-Gated HRV RMSSD: only compute when cardiac_snr_db > -0.5 dB
        rmssd, stress_idx, hrv_status = compute_hrv_rmssd(pred_bvp, fs=30.0, cardiac_snr_db=snr_db)
        coherence_pct = compute_inter_region_coherence(reg_pos[0], fs=30.0)

        regional_pos_dict = {
            "forehead": reg_pos[0, 0].tolist(),
            "left_malar": reg_pos[0, 1].tolist(),
            "right_malar": reg_pos[0, 2].tolist(),
        }

        return {
            "authenticity_score": auth_score,
            "verdict": verdict,
            "is_human": is_human,
            "heart_rate_bpm": hr_bpm,
            "hrv_rmssd_ms": rmssd,
            "hrv_status": hrv_status,
            "stress_index": stress_idx,
            "sqi_percent": sqi_pct,
            "snr_db": snr_db,
            "vascular_coherence_percent": coherence_pct,
            "effective_fps": round(effective_fps, 1),
            "latency_ms": latency_ms,
            "bvp_wave": pred_bvp.tolist(),
            "psd_freqs_bpm": psd_freqs.tolist(),
            "psd_powers": psd_powers.tolist(),
            "regional_pos": regional_pos_dict,
        }
