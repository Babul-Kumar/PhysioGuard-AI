import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  CameraOff,
  Heart,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Layers,
  Zap,
  Clock,
  Sparkles,
  BarChart2,
  Maximize2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import BvpOscilloscope from './BvpOscilloscope';
import PsdSpectrum from './PsdSpectrum';
import FlashChallengeModal from './FlashChallengeModal';
import { getWebSocketUrl } from '../utils/api';

export default function LiveScanner({ currentThreshold, onSnapshot }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const streamRef = useRef(null);
  const frameIntervalRef = useRef(null);

  const [isScanning, setIsScanning] = useState(false);
  const [showOverlays, setShowOverlays] = useState(true);
  const [showFlashModal, setShowFlashModal] = useState(false);
  const [hudData, setHudData] = useState(null);

  // Live Biometric Telemetry State
  const [telemetry, setTelemetry] = useState({
    authenticity_score: 0.0,
    verdict: 'CALIBRATING',
    is_human: false,
    heart_rate_bpm: 0.0,
    hrv_rmssd_ms: null,
    hrv_status: null,
    stress_index: 0.0,
    sqi_percent: 0.0,
    snr_db: 0.0,
    vascular_coherence_percent: 0.0,
    effective_fps: 30.0,
    latency_ms: 0.0,
    bvp_wave: [],
    psd_freqs_bpm: [],
    psd_powers: [],
    regional_pos: null,
  });

  const [bufferProgress, setBufferProgress] = useState(0);
  const [cameraError, setCameraError] = useState(null);
  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);

  // Start webcam and WebSocket on mount / toggle
  useEffect(() => {
    if (isScanning) {
      startCamera();
      connectWebSocket();
    } else {
      stopCamera();
      disconnectWebSocket();
    }
    return () => {
      stopCamera();
      disconnectWebSocket();
    };
  }, [isScanning]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      startFrameStreaming();
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Camera access denied or device not found. Please grant webcam permissions.');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setHudData(null);
  };

  const connectWebSocket = () => {
    try {
      const url = getWebSocketUrl();
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to PhysioGuard Live Telemetry WebSocket');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'hud' && data.hud) {
            setHudData(data.hud);
            setBufferProgress(Math.round((data.hud.buffer_fill / data.hud.buffer_total) * 100));
          } else if (data.type === 'telemetry') {
            setTelemetry((prev) => ({
              ...prev,
              authenticity_score: data.authenticity_score ?? prev.authenticity_score,
              verdict: data.verdict ?? prev.verdict,
              is_human: data.is_human ?? prev.is_human,
              heart_rate_bpm: data.heart_rate_bpm ?? prev.heart_rate_bpm,
              hrv_rmssd_ms: data.hrv_rmssd_ms !== undefined ? data.hrv_rmssd_ms : prev.hrv_rmssd_ms,
              hrv_status: data.hrv_status !== undefined ? data.hrv_status : prev.hrv_status,
              stress_index: data.stress_index !== undefined ? data.stress_index : prev.stress_index,
              sqi_percent: data.sqi_percent ?? prev.sqi_percent,
              snr_db: data.snr_db ?? prev.snr_db,
              vascular_coherence_percent:
                data.vascular_coherence_percent ?? prev.vascular_coherence_percent,
              effective_fps: data.effective_fps ?? prev.effective_fps,
              latency_ms: data.latency_ms ?? prev.latency_ms,
              bvp_wave: data.bvp_wave ?? prev.bvp_wave,
              psd_freqs_bpm: data.psd_freqs_bpm ?? prev.psd_freqs_bpm,
              psd_powers: data.psd_powers ?? prev.psd_powers,
              regional_pos: data.regional_pos ?? prev.regional_pos,
            }));

            // Pass snapshot to parent state demo cache
            if (onSnapshot && data.bvp_wave?.length) {
              onSnapshot(data);
            }

            // Confetti on first strong biological human confirmation
            if (data.is_human && data.authenticity_score > 0.85 && !hasTriggeredConfetti) {
              confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.6 },
                colors: ['#00F0FF', '#00D4E2', '#FFFFFF'],
              });
              setHasTriggeredConfetti(true);
            }
          }
        } catch (err) {
          console.error('WebSocket message parsing error:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket live telemetry error:', err);
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
    }
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  // Stream video frames to backend via WebSocket (~25 FPS)
  const startFrameStreaming = () => {
    const hiddenCanvas = document.createElement('canvas');
    hiddenCanvas.width = 320;
    hiddenCanvas.height = 240;
    const ctx = hiddenCanvas.getContext('2d');

    frameIntervalRef.current = setInterval(() => {
      if (
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN &&
        videoRef.current &&
        videoRef.current.readyState >= 2
      ) {
        ctx.drawImage(videoRef.current, 0, 0, 320, 240);
        const b64 = hiddenCanvas.toDataURL('image/jpeg', 0.65);
        wsRef.current.send(
          JSON.stringify({
            frame: b64,
            timestamp_ms: performance.now(),
            timestamp: performance.now(),
            threshold_override: currentThreshold,
          })
        );
      }
    }, 40); // 25 fps
  };

  // Render futuristic HUD overlays on the webcam canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    let animId;
    const ctx = canvas.getContext('2d');

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (isScanning && showOverlays && hudData?.rois) {
        // Draw each anatomical vascular bounding box
        hudData.rois.forEach((roi) => {
          const x1 = roi.x1 * w;
          const y1 = roi.y1 * h;
          const rw = (roi.x2 - roi.x1) * w;
          const rh = (roi.y2 - roi.y1) * h;

          let color = '#00F0FF';
          let label = 'ROI';
          if (roi.name === 'forehead') {
            color = '#00F0FF';
            label = 'ROI 1: GLABELLA (FOREHEAD)';
          } else if (roi.name === 'left_malar') {
            color = '#00D4E2';
            label = 'ROI 2: LEFT MALAR';
          } else if (roi.name === 'right_malar') {
            color = '#00D4E2';
            label = 'ROI 3: RIGHT MALAR';
          } else if (roi.name === 'ambient_bg') {
            color = '#E05A47';
            label = 'REF: AMBIENT BG';
          }

          // Subtle box stroke
          ctx.strokeStyle = `${color}66`;
          ctx.lineWidth = 1;
          ctx.strokeRect(x1, y1, rw, rh);

          // Corner bracket accents
          const bracketLen = Math.min(10, rw / 3, rh / 3);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;

          // Top-Left
          ctx.beginPath();
          ctx.moveTo(x1, y1 + bracketLen);
          ctx.lineTo(x1, y1);
          ctx.lineTo(x1 + bracketLen, y1);
          ctx.stroke();

          // Top-Right
          ctx.beginPath();
          ctx.moveTo(x1 + rw - bracketLen, y1);
          ctx.lineTo(x1 + rw, y1);
          ctx.lineTo(x1 + rw, y1 + bracketLen);
          ctx.stroke();

          // Bottom-Left
          ctx.beginPath();
          ctx.moveTo(x1, y1 + rh - bracketLen);
          ctx.lineTo(x1, y1 + rh);
          ctx.lineTo(x1 + bracketLen, y1 + rh);
          ctx.stroke();

          // Bottom-Right
          ctx.beginPath();
          ctx.moveTo(x1 + rw - bracketLen, y1 + rh);
          ctx.lineTo(x1 + rw, y1 + rh);
          ctx.lineTo(x1 + rw, y1 + rh - bracketLen);
          ctx.stroke();

          // Label pill
          ctx.fillStyle = `${color}cc`;
          ctx.font = 'bold 8px "JetBrains Mono", monospace';
          ctx.fillText(label, x1 + 2, Math.max(10, y1 - 4));
        });

        // Face tracking lock indicator
        if (!hudData.face_detected) {
          ctx.fillStyle = '#E05A47';
          ctx.font = 'bold 12px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('WARNING: FACE TARGET LOST - OCCLUSION FALLBACK ACTIVE', w / 2, 24);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isScanning, showOverlays, hudData]);

  const authScorePercent = Math.round(telemetry.authenticity_score * 100);
  const isHuman = telemetry.is_human;

  return (
    <div className="space-y-6">
      {/* Flash Challenge Modal */}
      <FlashChallengeModal
        isOpen={showFlashModal}
        onClose={() => setShowFlashModal(false)}
        videoRef={videoRef}
        onResult={(res) => {
          if (res.passed) {
            setTelemetry((prev) => ({
              ...prev,
              authenticity_score: Math.max(prev.authenticity_score, 0.95),
              verdict: 'BIOLOGICAL HUMAN (3D VERIFIED)',
              is_human: true,
            }));
          }
        }}
      />

      {/* Hero Cockpit Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Webcam & Spatial HUD (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel rounded-2xl p-4 border border-white/10 relative overflow-hidden shadow-2xl">
            {/* Header / HUD Status */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isScanning ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'
                  }`}
                />
                <span className="text-white font-semibold tracking-wider">
                  {isScanning ? 'SENSOR ARRAY ACTIVE' : 'SCANNER STANDBY'}
                </span>
              </div>
              <div className="text-slate-400">
                LOCK: <span className="text-cyan-400 font-bold">{bufferProgress}%</span>
              </div>
            </div>

            {/* Video + Canvas Viewport */}
            <div className="relative mt-3 aspect-[4/3] rounded-xl overflow-hidden bg-obsidian-950 border border-white/5 flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${!isScanning ? 'hidden' : ''}`}
              />

              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />

              {/* Offline Placeholder */}
              {!isScanning && (
                <div className="text-center p-6 space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-obsidian-800 border border-white/10 flex items-center justify-center text-slate-500">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-heading font-medium text-sm text-white">Live Camera Offline</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      Click "Engage Scanner" to initialize contactless facial rPPG telemetry
                    </p>
                  </div>
                </div>
              )}

              {/* Buffer Lock Ring Overlay when starting */}
              {isScanning && bufferProgress < 100 && (
                <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-cyan-500/30 text-[11px] font-mono text-cyan-300 flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span>Calibrating Vascular Lock {bufferProgress}%</span>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="mt-3 p-3 rounded-lg bg-terracotta-950/60 border border-terracotta-500/40 text-terracotta-300 text-xs font-mono">
                {cameraError}
              </div>
            )}

            {/* Controls Bar */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsScanning(!isScanning)}
                className={`flex-1 py-2.5 px-4 rounded-xl font-heading font-semibold text-xs transition flex items-center justify-center gap-2 shadow-lg ${
                  isScanning
                    ? 'bg-terracotta-500 text-white hover:bg-terracotta-600 shadow-terracotta-500/20'
                    : 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-cyan-500/20'
                }`}
              >
                {isScanning ? (
                  <>
                    <CameraOff className="w-4 h-4" />
                    <span>Disengage Scanner</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Engage Live Scanner</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setShowOverlays(!showOverlays)}
                disabled={!isScanning}
                title="Toggle Facial Vascular Overlays"
                className={`p-2.5 rounded-xl border transition ${
                  showOverlays
                    ? 'bg-obsidian-800 border-cyan-500/40 text-cyan-400'
                    : 'bg-obsidian-800 border-white/10 text-slate-500'
                } disabled:opacity-40`}
              >
                <Layers className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowFlashModal(true)}
                disabled={!isScanning}
                className="py-2.5 px-3.5 rounded-xl font-mono text-xs bg-gradient-to-r from-terracotta-500/20 to-cyan-500/20 border border-white/10 hover:border-cyan-500/40 text-white transition flex items-center gap-1.5 disabled:opacity-40"
              >
                <Zap className="w-3.5 h-3.5 text-terracotta-400" />
                <span>Active Replay Test</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: High-Density Biometric Telemetry & Oscilloscopes (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Top KPI Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Card 1: Authenticity Score & Verdict */}
            <div
              className={`p-3.5 rounded-2xl transition-all duration-300 col-span-2 ${
                telemetry.bvp_wave.length > 0
                  ? isHuman
                    ? 'glass-panel-cyan'
                    : 'glass-panel-terracotta'
                  : 'glass-panel'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Biological Authenticity
                </span>
                {isHuman ? (
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-terracotta-400" />
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span
                  className={`text-3xl font-mono font-bold tracking-tight ${
                    isHuman ? 'text-cyan-400 text-glow-cyan' : 'text-terracotta-400 text-glow-terracotta'
                  }`}
                >
                  {authScorePercent}%
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold uppercase ${
                    isHuman
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-terracotta-500/20 text-terracotta-300 border border-terracotta-500/40'
                  }`}
                >
                  {telemetry.verdict}
                </span>
              </div>
              <div className="mt-2 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                <span>Threshold: {currentThreshold.toFixed(4)}</span>
                <span>Latency: {telemetry.latency_ms}ms</span>
              </div>
            </div>

            {/* Card 2: Live Heart Rate */}
            <div className="glass-panel rounded-2xl p-3.5 border border-white/5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-mono uppercase">Heart Rate</span>
                <Heart
                  className={`w-4 h-4 text-terracotta-400 ${
                    telemetry.heart_rate_bpm > 40 ? 'animate-heartbeat' : ''
                  }`}
                />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-mono font-bold text-white">
                  {telemetry.heart_rate_bpm > 0 ? telemetry.heart_rate_bpm.toFixed(1) : '--'}
                </span>
                <span className="text-xs font-mono text-slate-400">BPM</span>
              </div>
              <div className="mt-2 text-[10px] text-slate-400 font-mono">
                SQI: <span className="text-cyan-400">{telemetry.sqi_percent}%</span>
              </div>
            </div>

            {/* Card 3: HRV RMSSD */}
            <div className="glass-panel rounded-2xl p-3.5 border border-white/5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-mono uppercase">HRV (RMSSD)</span>
                <Activity className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                {telemetry.hrv_status === 'Low SNR — Face Light' ? (
                  <span className="text-xs font-mono font-semibold text-amber-400 leading-tight">
                    Low SNR — Face Light
                  </span>
                ) : telemetry.hrv_rmssd_ms !== null && telemetry.hrv_rmssd_ms > 0 ? (
                  <>
                    <span className="text-2xl font-mono font-bold text-white">
                      {telemetry.hrv_rmssd_ms.toFixed(1)}
                    </span>
                    <span className="text-xs font-mono text-slate-400">ms</span>
                  </>
                ) : (
                  <span className="text-2xl font-mono font-bold text-white">--</span>
                )}
              </div>
              <div className="mt-2 text-[10px] text-slate-400 font-mono">
                {telemetry.hrv_status === 'Low SNR — Face Light' ? (
                  <span className="text-amber-500/80">SNR &le; -0.5 dB</span>
                ) : (
                  <>Stress: <span className="text-slate-300">{telemetry.stress_index || '--'}</span></>
                )}
              </div>
            </div>
          </div>

          {/* Low SQI Environmental Advisory Banner */}
          {isScanning && bufferProgress > 20 && telemetry.sqi_percent < 25.0 && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 backdrop-blur-md text-amber-300 text-xs font-mono flex items-center gap-3 shadow-lg">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <div className="leading-relaxed">
                <span className="font-bold text-amber-200">Environmental Advisory (SQI &lt; 25%):</span>
                {' '}Low signal quality detected. Face natural ambient light directly and avoid bright ceiling lights, spinning fans, or strong backlighting for optimal rPPG hemodynamic tracking.
              </div>
            </div>
          )}

          {/* Secondary Telemetry Strip: Phase Coherence, SNR, Dynamic FPS, Latency */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-obsidian-800/80 border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-slate-400 uppercase">Vascular Coherence</p>
                <p className="text-base font-mono font-bold text-cyan-400 mt-0.5">
                  {telemetry.vascular_coherence_percent > 0
                    ? `${telemetry.vascular_coherence_percent}%`
                    : '--'}
                </p>
              </div>
              <Layers className="w-4 h-4 text-cyan-400/60" />
            </div>

            <div className="p-3 rounded-xl bg-obsidian-800/80 border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-slate-400 uppercase">Cardiac SNR</p>
                <p className="text-base font-mono font-bold text-white mt-0.5">
                  {telemetry.snr_db !== 0 ? `${telemetry.snr_db} dB` : '--'}
                </p>
              </div>
              <BarChart2 className="w-4 h-4 text-slate-500" />
            </div>

            <div className="p-3 rounded-xl bg-obsidian-800/80 border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-slate-400 uppercase">Dynamic FPS</p>
                <p className="text-base font-mono font-bold text-cyan-400 mt-0.5">
                  {telemetry.effective_fps ? `${telemetry.effective_fps} Hz` : '30.0 Hz'}
                </p>
              </div>
              <Activity className="w-4 h-4 text-cyan-400/60" />
            </div>

            <div className="p-3 rounded-xl bg-obsidian-800/80 border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-slate-400 uppercase">ONNX Latency</p>
                <p className="text-base font-mono font-bold text-slate-300 mt-0.5">
                  {telemetry.latency_ms > 0 ? `${telemetry.latency_ms} ms` : '--'}
                </p>
              </div>
              <Clock className="w-4 h-4 text-slate-500" />
            </div>
          </div>

          {/* Dual Real-Time Telemetry Oscilloscopes */}
          <div className="space-y-4">
            {/* ICU BVP Waveform Oscilloscope */}
            <div className="glass-panel rounded-2xl p-4 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
                    ICU Blood Volume Pulse (BVP) Waveform
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">128-SAMPLE BUFFER @ 30 FPS</span>
              </div>
              <BvpOscilloscope wave={telemetry.bvp_wave} height={130} isLive={isScanning} />
            </div>

            {/* Welch FFT Power Spectral Density */}
            <div className="glass-panel rounded-2xl p-4 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
                    Welch Power Spectral Density (PSD Spectrum)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  PEAK: {telemetry.heart_rate_bpm ? `${telemetry.heart_rate_bpm} BPM` : 'STANDBY'}
                </span>
              </div>
              <PsdSpectrum
                freqs={telemetry.psd_freqs_bpm}
                powers={telemetry.psd_powers}
                peakBpm={telemetry.heart_rate_bpm}
                height={120}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

