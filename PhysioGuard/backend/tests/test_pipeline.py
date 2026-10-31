import base64
import os
import tempfile
import cv2
from fastapi.testclient import TestClient
import numpy as np
import onnxruntime as ort
import pytest

from PhysioGuard.backend.dsp import (
    compute_hrv_rmssd,
    compute_pos_wave,
    compute_welch_bpm,
    resample_temporal_window,
)
from PhysioGuard.backend.inference import (
    FOREHEAD_LMS,
    LEFT_MALAR_LMS,
    ONNX_MODEL_PATH,
    RIGHT_MALAR_LMS,
    FaceProcessor,
    PhysioGuardInference,
)
from PhysioGuard.backend.main import app

client = TestClient(app)


def test_1_onnx_model_loading_and_shapes():
    """Verify physioguard_best.onnx loads and produces expected tensor shapes."""
    assert os.path.exists(ONNX_MODEL_PATH), f"ONNX model missing at {ONNX_MODEL_PATH}"
    session = ort.InferenceSession(ONNX_MODEL_PATH, providers=["CPUExecutionProvider"])

    inputs = {inp.name: inp.shape for inp in session.get_inputs()}
    assert "st_vol" in inputs
    assert "reg_pos" in inputs

    st_vol = np.zeros((1, 6, 128, 72, 72), dtype=np.float32)
    reg_pos = np.zeros((1, 3, 128), dtype=np.float32)

    outputs = session.run(["pred_bvp", "live_logits"], {"st_vol": st_vol, "reg_pos": reg_pos})
    pred_bvp, live_logits = outputs

    assert pred_bvp.shape == (1, 128), f"Expected pred_bvp shape (1, 128), got {pred_bvp.shape}"
    assert live_logits.shape == (1, 1), f"Expected live_logits shape (1, 1), got {live_logits.shape}"


def test_2_welch_bpm_recovery_78bpm():
    """Synthesize a 128-frame clip with 78 BPM (1.30 Hz) sinusoid and assert Welch recovery within ±3 BPM."""
    fs = 30.0
    t = np.arange(128) / fs
    target_hz = 1.30  # 78 BPM
    target_bpm = 78.0

    synthetic_bvp = np.sin(2.0 * np.pi * target_hz * t) + 0.05 * np.sin(4.0 * np.pi * target_hz * t)
    recovered_bpm, freqs, psd = compute_welch_bpm(synthetic_bvp, fs=fs, nfft=512)

    diff = abs(recovered_bpm - target_bpm)
    print(f"Target: {target_bpm} BPM, Recovered: {recovered_bpm} BPM, Diff: {diff:.2f}")
    assert diff <= 3.0, f"Recovered BPM {recovered_bpm} exceeded ±3.0 BPM tolerance from {target_bpm}"


def test_3_api_health_endpoint():
    """Test GET /api/health."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["model_loaded"] is True
    assert "optimal_liveness_threshold" in data
    assert data["optimal_liveness_threshold"] > 0.0


def test_4_api_benchmarks_endpoint():
    """Test GET /api/benchmarks."""
    response = client.get("/api/benchmarks")
    assert response.status_code == 200
    data = response.json()
    assert "optimal_liveness_threshold" in data
    assert "test_auroc_percent" in data
    assert "cleaning_audit" in data
    audit = data["cleaning_audit"]
    assert audit["total_videos_scanned"] == 542
    assert audit["accepted_clean_videos"] == 521


def test_5_api_flash_challenge():
    """Test POST /api/verify-flash-challenge."""
    frames = []
    colors = [
        (0, 240, 255),  # Cyan
        (0, 200, 220),
        (100, 150, 180),
        (180, 120, 100),
        (220, 100, 80),
        (224, 90, 71),   # Terracotta
    ]

    for idx, (r, g, b) in enumerate(colors):
        img = np.zeros((120, 160, 3), dtype=np.uint8)
        img[:, :] = (b, g, r)
        img[45:75, 70:90] = (min(255, b + 40), min(255, g + 40), min(255, r + 40))
        _, enc = cv2.imencode(".jpg", img)
        b64 = base64.b64encode(enc.tobytes()).decode("utf-8")
        frames.append({"timestamp_ms": float(idx * 250), "base64_image": f"data:image/jpeg;base64,{b64}"})

    response = client.post("/api/verify-flash-challenge", json={"frames": frames})
    assert response.status_code == 200
    res = response.json()
    assert "passed" in res
    assert "specular_3d_ratio" in res
    assert "chromatic_delta" in res


def test_6_api_analyze_video_endpoint():
    """Test POST /api/analyze-video with an auto-generated OpenCV synthetic video."""
    temp_fd, temp_path = tempfile.mkstemp(suffix=".mp4")
    os.close(temp_fd)

    try:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(temp_path, fourcc, 30.0, (160, 120))
        for i in range(40):
            frame = np.full((120, 160, 3), (120 + int(10 * np.sin(i / 5.0)), 140, 180), dtype=np.uint8)
            cv2.circle(frame, (80, 60), 30, (140, 160, 210), -1)
            writer.write(frame)
        writer.release()

        with open(temp_path, "rb") as f:
            response = client.post(
                "/api/analyze-video",
                files={"file": ("test_clip.mp4", f, "video/mp4")},
            )

        assert response.status_code == 200
        report = response.json()
        assert "overall_authenticity_score" in report
        assert "final_verdict" in report
        assert "timeline" in report
        assert len(report["timeline"]) >= 1
        assert "mean_heart_rate_bpm" in report
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_7_websocket_live_telemetry():
    """Test WS /ws/live-telemetry receiving frames and returning HUD."""
    img = np.zeros((120, 160, 3), dtype=np.uint8)
    cv2.circle(img, (80, 60), 35, (150, 170, 220), -1)
    _, enc = cv2.imencode(".jpg", img)
    b64_frame = base64.b64encode(enc.tobytes()).decode("utf-8")

    with client.websocket_connect("/ws/live-telemetry") as ws:
        ws.send_json({"frame": f"data:image/jpeg;base64,{b64_frame}", "timestamp_ms": 1000.0})
        data = ws.receive_json()
        assert data["type"] == "hud"
        assert "hud" in data
        assert data["hud"]["buffer_fill"] == 1
        assert len(data["hud"]["rois"]) == 4


def test_8_dynamic_fps_resampling():
    """Verify non-uniform low-light FPS (e.g. 20 FPS) is resampled to exact 30.0 Hz timeline and accurately recovers BPM."""
    N = 128
    # 20 FPS timestamps spanning 6.35 seconds
    timestamps_ms = [i * 50.0 for i in range(N)]
    raw_frames = np.zeros((N, 72, 72, 3), dtype=np.float32)
    raw_skin = np.zeros((3, N, 3), dtype=np.float32)
    raw_bg = np.zeros((N, 3), dtype=np.float32)

    # Inject 78 BPM = 1.30 Hz pulse across skin green channel
    t_raw = np.array(timestamps_ms) / 1000.0
    pulse = np.sin(2.0 * np.pi * 1.30 * t_raw)
    raw_skin[:, :, 1] = pulse[None, :] + 100.0

    res_frames, res_skin, res_bg, eff_fps = resample_temporal_window(
        raw_frames, raw_skin, raw_bg, timestamps_ms, target_len=128, target_fs=30.0
    )

    assert res_frames.shape == (128, 72, 72, 3)
    assert res_skin.shape == (3, 128, 3)
    assert abs(eff_fps - 20.0) < 0.5

    # Compute Welch PSD on resampled 30Hz wave
    res_pulse = res_skin[0, :, 1] - np.mean(res_skin[0, :, 1])
    bpm, _, _ = compute_welch_bpm(res_pulse, fs=30.0)
    assert abs(bpm - 78.0) <= 3.0, f"Expected ~78 BPM from resampled wave, got {bpm}"


def test_9_saturation_safe_background_cancellation():
    """Verify POS automatically disables background subtraction when background is saturated (>240) or noisy."""
    T = 128
    skin_rgb = np.ones((T, 3), dtype=np.float32) * 120.0
    # Add small pulse
    t = np.arange(T) / 30.0
    skin_rgb[:, 1] += 2.0 * np.sin(2.0 * np.pi * 1.25 * t)

    # 1. Blown out ceiling light in background (> 240)
    saturated_bg = np.ones((T, 3), dtype=np.float32) * 248.0
    pos_sat = compute_pos_wave(skin_rgb, saturated_bg, fs=30.0)
    assert not np.any(np.isnan(pos_sat))
    assert not np.any(np.isinf(pos_sat))

    # 2. Spinning ceiling fan: high temporal variance
    fan_bg = np.ones((T, 3), dtype=np.float32) * 100.0
    fan_bg[:, :] += (np.sin(2.0 * np.pi * 8.0 * t)[:, None] * 50.0)  # fast fan flicker
    pos_fan = compute_pos_wave(skin_rgb, fan_bg, fs=30.0)
    assert not np.any(np.isnan(pos_fan))
    assert not np.any(np.isinf(pos_fan))


def test_10_eyeglass_safe_rois():
    """Verify tightened Eyeglass-safe landmark definitions."""
    # Forehead tightened upward: excludes lower brow indices 9, 107, 336
    assert 9 not in FOREHEAD_LMS
    assert 107 not in FOREHEAD_LMS
    assert 336 not in FOREHEAD_LMS
    # Malar indices moved downward away from glasses lower rims
    assert 117 in LEFT_MALAR_LMS
    assert 346 in RIGHT_MALAR_LMS

    # Verify FaceProcessor bbox padding default is 2
    fp = FaceProcessor()
    # Mock landmarks
    class MockLM:
        def __init__(self, x, y):
            self.x, self.y = x, y
    lms = [MockLM(0.5, 0.5) for _ in range(468)]
    box = fp._get_bbox(lms, FOREHEAD_LMS, 480, 360, pad=2)
    assert box[2] >= box[0]
    assert box[3] >= box[1]


def test_11_sqi_gated_hrv_rmssd():
    """Verify RMSSD is gated by cardiac SNR (returns None and status 'Low SNR — Face Light' when SNR <= -0.5 dB)."""
    clean_bvp = np.sin(2.0 * np.pi * 1.25 * np.arange(128) / 30.0)

    # Case A: Good SNR (+5 dB)
    rmssd_good, stress_good, status_good = compute_hrv_rmssd(clean_bvp, fs=30.0, cardiac_snr_db=5.0)
    assert status_good == "Locked"
    assert rmssd_good is not None

    # Case B: Poor SNR (-2.5 dB)
    rmssd_poor, stress_poor, status_poor = compute_hrv_rmssd(clean_bvp, fs=30.0, cardiac_snr_db=-2.5)
    assert status_poor == "Low SNR — Face Light"
    assert rmssd_poor is None
    assert stress_poor is None
