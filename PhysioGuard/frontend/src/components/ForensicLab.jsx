import React, { useState, useRef } from 'react';
import {
  Upload,
  Film,
  ShieldCheck,
  ShieldAlert,
  Download,
  Play,
  Pause,
  Activity,
  Layers,
  FileText,
  AlertCircle,
  Clock,
  Heart,
  CheckCircle2,
} from 'lucide-react';
import { analyzeVideo } from '../utils/api';
import BvpOscilloscope from './BvpOscilloscope';
import PsdSpectrum from './PsdSpectrum';

export default function ForensicLab({ currentThreshold }) {
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile.name.match(/\.(mp4|avi|webm|mov)$/i)) {
      setError('Unsupported video format. Please upload .mp4, .avi, or .webm');
      return;
    }
    setError(null);
    setFile(selectedFile);
    setReport(null);
    const url = URL.createObjectURL(selectedFile);
    setVideoUrl(url);
  };

  const startAnalysis = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const data = await analyzeVideo(file, currentThreshold);
      setReport(data);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to process video forensic analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seekTo = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  };

  const downloadJsonCertificate = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PhysioGuard_Forensic_Certificate_${report.video_name.replace(/\.[^/.]+$/, '')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isHuman = report?.final_verdict === 'BIOLOGICAL HUMAN';

  return (
    <div className="space-y-6">
      {/* Upload & Action Bar */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h2 className="font-heading font-bold text-xl text-white flex items-center gap-2 justify-center md:justify-start">
              <Film className="w-5 h-5 text-cyan-400" />
              <span>Deepfake Video Forensic Lab & Chrono-Inspector</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Sliding-window biological rPPG temporal analysis across facial vascular zones
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-4 rounded-xl text-xs font-mono bg-obsidian-800 hover:bg-obsidian-700 text-slate-200 border border-white/10 transition flex items-center gap-2"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>{file ? 'Change Video' : 'Select Video File'}</span>
            </button>

            {file && (
              <button
                onClick={startAnalysis}
                disabled={isAnalyzing}
                className="py-2.5 px-5 rounded-xl text-xs font-mono font-semibold bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/20 transition flex items-center gap-2 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing Windows...</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4" />
                    <span>Run Deepfake Analysis</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Drag and Drop Zone if no file */}
        {!file && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className="mt-6 border-2 border-dashed border-white/10 hover:border-cyan-500/50 rounded-2xl p-10 text-center cursor-pointer bg-obsidian-950/40 hover:bg-obsidian-800/40 transition group"
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-obsidian-800 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-500/40 transition">
              <Upload className="w-6 h-6" />
            </div>
            <p className="mt-4 font-heading font-medium text-sm text-white">
              Drag & Drop suspicious video clip here, or browse files
            </p>
            <p className="mt-1 text-xs text-slate-500 font-mono">
              Supports MP4, AVI, WebM (e.g. Celeb-DF, FaceForensics++, or real recording)
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-terracotta-950/60 border border-terracotta-500/40 text-terracotta-300 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Analysis Results Viewport */}
      {report && (
        <div className="space-y-6">
          {/* Executive Verdict Hero Card */}
          <div
            className={`p-6 rounded-2xl border shadow-2xl transition-all ${
              isHuman ? 'glass-panel-cyan' : 'glass-panel-terracotta'
            }`}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`p-3.5 rounded-2xl border ${
                    isHuman
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                      : 'bg-terracotta-500/10 border-terracotta-500/30 text-terracotta-400'
                  }`}
                >
                  {isHuman ? (
                    <ShieldCheck className="w-8 h-8" />
                  ) : (
                    <ShieldAlert className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded uppercase ${
                        isHuman
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-terracotta-500/20 text-terracotta-300 border border-terracotta-500/40'
                      }`}
                    >
                      {report.final_verdict}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Target: {report.video_name}
                    </span>
                  </div>
                  <h3 className="text-2xl font-mono font-bold text-white mt-1">
                    Authenticity Score:{' '}
                    <span className={isHuman ? 'text-cyan-400' : 'text-terracotta-400'}>
                      {Math.round(report.overall_authenticity_score * 100)}%
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    Evaluation based on {report.total_frames} frames across {report.duration_sec}s
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={downloadJsonCertificate}
                  className="flex-1 md:flex-none py-2.5 px-4 rounded-xl text-xs font-mono bg-cyan-500 hover:bg-cyan-400 text-black font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Certificate (JSON)</span>
                </button>
              </div>
            </div>

            {/* Forensic Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
              <div className="p-3 rounded-xl bg-obsidian-950/60 border border-white/5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Mean Heart Rate</div>
                <div className="text-lg font-mono font-bold text-white mt-0.5">
                  {report.mean_heart_rate_bpm} BPM
                </div>
              </div>
              <div className="p-3 rounded-xl bg-obsidian-950/60 border border-white/5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">HRV (RMSSD)</div>
                <div className="text-lg font-mono font-bold text-white mt-0.5">
                  {report.mean_hrv_rmssd_ms} ms
                </div>
              </div>
              <div className="p-3 rounded-xl bg-obsidian-950/60 border border-white/5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Vascular Coherence</div>
                <div className="text-lg font-mono font-bold text-cyan-400 mt-0.5">
                  {report.mean_vascular_coherence_percent}%
                </div>
              </div>
              <div className="p-3 rounded-xl bg-obsidian-950/60 border border-white/5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Signal Quality (SQI)</div>
                <div className="text-lg font-mono font-bold text-white mt-0.5">
                  {report.mean_sqi_percent}%
                </div>
              </div>
            </div>
          </div>

          {/* Video Playback & Timeline Inspector Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Video Player (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="glass-panel rounded-2xl p-4 border border-white/10 shadow-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>VIDEO SYNCHRONIZER</span>
                  <span>{currentTime.toFixed(2)}s / {report.duration_sec.toFixed(2)}s</span>
                </div>

                <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-white/5">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => setIsPlaying(false)}
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-black/60 hover:bg-cyan-500 hover:text-black text-white backdrop-blur-md flex items-center justify-center transition border border-white/20"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Temporal Spoof Timeline & POS Waves (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Chrono Timeline */}
              <div className="glass-panel rounded-2xl p-4 border border-white/10 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
                      Temporal Spoof Probability Timeline
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    CLICK BAR TO SCRUB VIDEO
                  </span>
                </div>

                {/* Timeline interactive bar */}
                <div className="h-20 bg-obsidian-950 rounded-xl p-2 flex items-end gap-1 overflow-x-auto border border-white/5 relative">
                  {/* Current scrub indicator */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white z-10 pointer-events-none transition-all duration-75"
                    style={{
                      left: `${Math.min(
                        100,
                        (currentTime / (report.duration_sec || 1)) * 100
                      )}%`,
                    }}
                  />

                  {report.timeline.map((seg, idx) => {
                    const isPassed = seg.is_human;
                    const heightPct = Math.max(15, Math.round(seg.authenticity_score * 100));
                    return (
                      <div
                        key={idx}
                        onClick={() => seekTo(seg.timestamp_sec)}
                        title={`Time: ${seg.timestamp_sec}s | Authenticity: ${Math.round(
                          seg.authenticity_score * 100
                        )}% | BPM: ${seg.heart_rate_bpm}`}
                        className={`flex-1 rounded-sm transition cursor-pointer hover:brightness-125 ${
                          isPassed ? 'bg-cyan-400' : 'bg-terracotta-500'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-cyan-400" />
                    <span>Biological Human Window (&ge; {currentThreshold.toFixed(2)})</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-terracotta-500" />
                    <span>Synthetic Spoof Window</span>
                  </span>
                </div>
              </div>

              {/* Regional POS Wave Phase Alignment */}
              <div className="glass-panel rounded-2xl p-4 border border-white/10 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
                      Regional Phase Coherence: Forehead vs Cheeks
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400">
                    ALIGNMENT: {report.mean_vascular_coherence_percent}%
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                    <span className="text-cyan-400">ROI 1: Glabella (Forehead)</span>
                    <span className="text-slate-500">POS Waveform</span>
                  </div>
                  <BvpOscilloscope wave={report.regional_forehead_sample} height={70} isLive={false} />

                  <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between pt-1">
                    <span className="text-cyan-300">ROI 2 & 3: Cheeks (Malar Regions)</span>
                    <span className="text-slate-500">POS Waveform</span>
                  </div>
                  <BvpOscilloscope wave={report.regional_left_malar_sample} height={70} isLive={false} />
                </div>

                <p className="text-[11px] text-slate-400 font-mono leading-relaxed pt-1">
                  <span className="text-white font-semibold">Forensic Insight:</span> In authentic living tissue, pulsatile blood pressure waves propagate symmetrically across glabella and malar regions, showing tight temporal phase locking. Deepfake facial reenactment models alter cheek textures independently, inducing observable phase desynchronization.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

