from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    model_loaded: bool = True
    onnx_latency_ms: float
    active_provider: str
    optimal_liveness_threshold: float


class CleaningAudit(BaseModel):
    total_videos_scanned: int
    dropped_corrupt_or_short: int
    dropped_low_face_tracking: int
    dropped_corrupt_oximeter_gt: int
    dropped_out_of_range_bpm: int
    accepted_clean_videos: int
    total_clean_clips_saved: int


class BenchmarkResponse(BaseModel):
    optimal_liveness_threshold: float
    test_auroc_percent: float
    test_hr_mae_bpm: float
    cleaning_audit: CleaningAudit
    plot_url: str


class ROIBox(BaseModel):
    name: str
    x1: float
    y1: float
    x2: float
    y2: float


class FrameHUD(BaseModel):
    face_detected: bool
    buffer_fill: int
    buffer_total: int = 128
    rois: List[ROIBox] = Field(default_factory=list)


class LiveTelemetryPayload(BaseModel):
    type: str = "telemetry"
    hud: Optional[FrameHUD] = None
    authenticity_score: Optional[float] = None
    verdict: Optional[str] = None
    is_human: Optional[bool] = None
    heart_rate_bpm: Optional[float] = None
    hrv_rmssd_ms: Optional[float] = None
    hrv_status: Optional[str] = None
    stress_index: Optional[float] = None
    sqi_percent: Optional[float] = None
    snr_db: Optional[float] = None
    vascular_coherence_percent: Optional[float] = None
    effective_fps: Optional[float] = None
    latency_ms: Optional[float] = None
    bvp_wave: Optional[List[float]] = None
    psd_freqs_bpm: Optional[List[float]] = None
    psd_powers: Optional[List[float]] = None
    regional_pos: Optional[Dict[str, List[float]]] = None


class TimelineSegment(BaseModel):
    timestamp_sec: float
    frame_idx: int
    authenticity_score: float
    is_human: bool
    heart_rate_bpm: float
    sqi_percent: float
    vascular_coherence_percent: float


class ForensicReport(BaseModel):
    video_name: str
    duration_sec: float
    total_frames: int
    overall_authenticity_score: float
    final_verdict: str
    mean_heart_rate_bpm: float
    mean_hrv_rmssd_ms: float
    mean_vascular_coherence_percent: float
    mean_sqi_percent: float
    timeline: List[TimelineSegment]
    bvp_sample: List[float] = Field(default_factory=list)
    psd_freqs_bpm: List[float] = Field(default_factory=list)
    psd_powers: List[float] = Field(default_factory=list)
    regional_forehead_sample: List[float] = Field(default_factory=list)
    regional_left_malar_sample: List[float] = Field(default_factory=list)
    regional_right_malar_sample: List[float] = Field(default_factory=list)
    generated_at: str


class FlashChallengeFrame(BaseModel):
    timestamp_ms: float
    base64_image: str


class FlashChallengeRequest(BaseModel):
    frames: List[FlashChallengeFrame]


class FlashChallengeResponse(BaseModel):
    passed: bool
    verdict: str
    specular_3d_ratio: float
    chromatic_delta: float
    message: str

