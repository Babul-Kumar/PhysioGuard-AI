# PhysioGuard: Contactless Cardiovascular Telemetry & Biological Deepfake Forensics

**PhysioGuard** is a production-grade, real-time Contactless Cardiovascular Telemetry and Biological Deepfake Forensic Web Application powered by a trained **Multi-Region 3D Spatio-Temporal rPPG ONNX model** (`PhysioGuardNet`).

---

## Architecture & Mathematical Contract

### 1. Multi-Region Spatial-Temporal Volume (`st_vol`)
- **Landmark Extraction:** Detects 468 facial landmarks per frame via MediaPipe (`mediapipe.tasks.python.vision.FaceLandmarker`).
- **Vascular ROIs:**
  - **Forehead (Glabella):** Indices `[10, 67, 109, 338, 297, 151]` (tightened upward for eyeglass safety)
  - **Left Malar (Left Cheek):** Indices `[117, 118, 101, 50, 205]`
  - **Right Malar (Right Cheek):** Indices `[346, 347, 330, 280, 425]`
- Crops are padded by 2px, resized to `(width=72, height=24)`, and stacked vertically into a `(72, 72, 3)` patch per frame.
- Over a 128-frame sliding window (4.27s @ 30 FPS):
  - **Temporal Difference Branch (`diff`):**
    $$\text{diff}_{t} = \frac{I_{t+1} - I_{t}}{I_{t+1} + I_{t} + 10^{-5}}$$
    Standardized and clamped to $[-3.0, 3.0]$.
  - **Standardized Appearance Branch (`app`):**
    Z-score standardized across temporal and spatial dimensions.
  - Concatenation yields `(1, 6, 128, 72, 72)` tensor input.

### 2. Ambient-Subtracted Plane-Orthogonal-to-Skin (`reg_pos`)
- For each of the 3 vascular zones, mean RGB is tracked against the top-left ambient background corner (`bg_rgb`):
  $$C_n = \frac{C_{\text{skin}}}{\mu_{\text{skin}}} - 0.25 \left(\frac{C_{\text{bg}}}{\mu_{\text{bg}}} - 1.0\right)$$
  $$S_1 = C_{n, G} - C_{n, B}, \quad S_2 = C_{n, G} + C_{n, B} - 2 C_{n, R}$$
  $$H = S_1 + \frac{\sigma(S_1)}{\sigma(S_2)} S_2$$
- Saturated/blown-out ceiling lights (`mean > 240`) and spinning ceiling fan variance (`var > 150`) automatically bypass ambient subtraction to prevent noise injection.
- Detrended and bandpassed with a 3rd-order zero-phase Butterworth filter $[0.80, 3.0]\,\text{Hz}$ ($48 - 180\,\text{BPM}$).
- Stacked into `(1, 3, 128)` tensor input.

### 3. Dual Multi-Task Inference & DSP Post-Processing
- **`pred_bvp` $(1, 128)$:** Filtered Blood Volume Pulse (BVP) waveform.
  - **Heart Rate (BPM):** Welch PSD peak frequency in $[0.80, 3.0]\,\text{Hz}$.
  - **Signal Quality Index (SQI & SNR dB):** Power ratio of fundamental + 1st harmonic vs noise floor.
  - **Heart Rate Variability (HRV):** SQI-gated (active when SNR $> -0.5\,\text{dB}$) $\rightarrow$ Inter-Beat Intervals (IBI) $\rightarrow$ RMSSD (ms) & Baevsky Stress Index.
  - **Vascular Phase Coherence (%):** Mean pairwise cosine similarity of normalized FFT spectral vectors across Forehead, Left Malar, and Right Malar.
- **`live_logits` $(1, 1)$:** Sigmoid liveness probability evaluated against the trained optimal Youden threshold ($0.6258$).

### 4. Active 3D Specular Replay Defense
- Emits a 1.5-second illumination sweep (Cyan $490\,\text{nm} \rightarrow$ Terracotta $600\,\text{nm}$).
- Evaluates 3D nasal cartilage specular reflectance ratio against peripheral flat glass reflections to defeat iPad/phone replay attacks.

---

## Directory Structure

```
cse 471/
├── start_physioguard.bat              # One-click Windows startup script
├── README.md                          # Full system documentation
├── .gitignore                         # Git exclusion rules
├── .venv/                             # Python virtual environment
└── PhysioGuard/
    ├── models/
    │   ├── physioguard_best.onnx      # Primary ONNX inference graph
    │   ├── physioguard_best.pth       # PyTorch checkpoint backup
    │   ├── face_landmarker.task       # MediaPipe Face Landmarker model
    │   ├── metrics_summary.json       # Optimal threshold & validation metrics
    │   └── plots/
    │       └── physioguard_test_benchmark.png # Static held-out test ROC & Bland-Altman
    ├── backend/                       # Modular FastAPI Application
    │   ├── main.py                    # REST APIs, WebSockets, static routes
    │   ├── inference.py               # FaceProcessor & PhysioGuardInference
    │   ├── dsp.py                     # POS, Welch PSD, SNR/SQI, RMSSD, Coherence
    │   ├── schemas.py                 # Pydantic v2 data models
    │   ├── requirements.txt           # Python dependency specification
    │   └── tests/
    │       └── test_pipeline.py       # End-to-end pytest verification suite
    └── frontend/                      # React 18 + Vite + Tailwind CSS Cockpit
        ├── src/
        │   ├── components/
        │   │   ├── Navbar.jsx         # Executive status header & tab navigation
        │   │   ├── LiveScanner.jsx    # Live 30 FPS webcam HUD & oscilloscopes
        │   │   ├── ForensicLab.jsx    # Video upload & timeline inspector
        │   │   ├── BenchmarkSuite.jsx # AUROC, HR MAE & 542-video audit funnel
        │   │   ├── StageDemo.jsx      # Viva mode with Youden tuner & comparison matrix
        │   │   ├── BvpOscilloscope.jsx# High-DPI canvas BVP trace
        │   │   ├── PsdSpectrum.jsx    # High-DPI canvas Welch PSD spectrum
        │   │   └── FlashChallengeModal.jsx # Active 3D chromatic sweep test
        │   ├── utils/api.js           # REST & WebSocket client helpers
        │   ├── App.jsx                # Root layout & global telemetry state
        │   ├── main.jsx               # React entrypoint
        │   └── index.css              # Cyber-clinical glassmorphism & typography
        ├── tailwind.config.js         # Obsidian, Cyan, Terracotta theme palette
        ├── vite.config.js             # API proxying and dev server configuration
        └── package.json               # Frontend dependencies (lucide, tailwind, etc.)
```

---

## Quickstart Guide

### Option A: One-Click Windows Launch
Double-click `start_physioguard.bat` in the workspace root. It will:
1. Start the FastAPI backend on `http://localhost:8000`.
2. Start the Vite React frontend on `http://localhost:5173`.
3. Open your default web browser directly to the dashboard.

### Option B: Manual Terminal Execution

**Terminal 1 (Backend):**
```powershell
.\.venv\Scripts\python.exe -m uvicorn PhysioGuard.backend.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 (Frontend):**
```powershell
cd PhysioGuard\frontend
npm run dev
```

Visit `http://localhost:5173`.

---

## Running the Automated Test Suite

To run the full end-to-end verification test suite:

```powershell
.\.venv\Scripts\python.exe -m pytest PhysioGuard/backend/tests/test_pipeline.py -v -s
```

---

## Verified Model Benchmarks

| Metric | Result | Description |
| :--- | :--- | :--- |
| **Test AUROC** | **89.88%** | Area Under ROC Curve on held-out test videos |
| **Heart Rate MAE** | **7.37 BPM** | Mean Absolute Error vs clinical oximeter PPG |
| **Optimal Liveness Threshold** | **0.6258** | Youden's Index optimal cut-off on validation split |
| **Raw Videos Scanned** | **542** | Full dataset screening |
| **Accepted Clean Videos** | **521 (96.1%)**| Filtered for face tracking stability & quality |
| **Total Clean Clips** | **1,188** | 128-frame clips used for training & evaluation |
