import React, { useState } from 'react';
import {
  Sliders,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Camera,
  Layers,
  Activity,
  Heart,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';
import BvpOscilloscope from './BvpOscilloscope';

export default function StageDemo({
  threshold,
  setThreshold,
  optimalThreshold,
  lastSnapshot,
}) {
  const [humanSnapshot, setHumanSnapshot] = useState(null);
  const [spoofSnapshot, setSpoofSnapshot] = useState(null);
  const [copiedNote, setCopiedNote] = useState(false);

  const captureAsHuman = () => {
    if (lastSnapshot) {
      setHumanSnapshot({
        ...lastSnapshot,
        capturedAt: new Date().toLocaleTimeString(),
      });
    }
  };

  const captureAsSpoof = () => {
    if (lastSnapshot) {
      setSpoofSnapshot({
        ...lastSnapshot,
        capturedAt: new Date().toLocaleTimeString(),
      });
    }
  };

  const copyVivaNotes = () => {
    const notes = `PhysioGuard Viva Defense Checklist:
1. Explain multi-region rPPG: Glabella (Forehead) and Malar (Cheeks) are selected because they receive distinct terminal branches of the internal/external carotid arteries with high microvascular density.
2. Explain the Ambient-Subtracted POS algorithm: Decouples ambient lighting swings by tracking background ROI cn = cn_skin - 0.25 * (cn_bg - 1.0).
3. Explain the Dual Multi-Task Architecture: Jointly learns pred_bvp (temporal cardiac wave) and live_logits (binary authenticity classification) so spoofing is caught from absent biological hemodynamics.
4. Explain the Active 3D Replay Challenge: Flashes a 1.5s cyan-to-terracotta pulse. Real 3D nasal cartilage scatters light differentially, whereas 2D iPad/laptop screens reflect flat planar specular light.`;
    navigator.clipboard.writeText(notes);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider">
            <Sliders className="w-4 h-4" />
            <span>Viva / Stage Presentation Mode</span>
          </div>
          <h2 className="text-2xl font-heading font-bold text-white mt-1">
            Real-Time Threshold Tuner & Snapshot Comparison Matrix
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Compare a live professor's heartbeat directly against a phone deepfake replay on stage
          </p>
        </div>

        <button
          onClick={copyVivaNotes}
          className="py-2.5 px-4 rounded-xl text-xs font-mono bg-obsidian-800 hover:bg-obsidian-700 text-slate-200 border border-white/10 transition flex items-center gap-2"
        >
          {copiedNote ? <Check className="w-4 h-4 text-cyan-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
          <span>{copiedNote ? 'Copied Viva Script!' : 'Copy Viva Defense Script'}</span>
        </button>
      </div>

      {/* Threshold Tuner Card */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-heading font-semibold text-white">
              Dynamic Liveness Decision Threshold
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Controls sensitivity balance between False Rejection Rate (FRR) and False Acceptance Rate (FAR)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-2xl font-mono font-bold text-cyan-400">
              {threshold.toFixed(4)}
            </span>
            <button
              onClick={() => setThreshold(optimalThreshold)}
              className="py-1.5 px-3 rounded-lg text-xs font-mono bg-obsidian-800 hover:bg-obsidian-700 text-slate-300 border border-white/10 flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Reset Youden Optimal ({optimalThreshold.toFixed(4)})</span>
            </button>
          </div>
        </div>

        {/* Slider input */}
        <div className="space-y-2 pt-2">
          <input
            type="range"
            min="0.10"
            max="0.95"
            step="0.005"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full h-2 bg-obsidian-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>0.10 (Permissive / Low Security)</span>
            <span className="text-cyan-400 font-bold">
              &uarr; Optimal Youden Index ({optimalThreshold.toFixed(4)})
            </span>
            <span>0.95 (Ultra-Strict / High Security)</span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Matrix */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-base font-heading font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Side-by-Side Snapshot Comparison: Living Biological vs Synthetic Spoof</span>
          </h3>

          <div className="flex items-center gap-2">
            <button
              onClick={captureAsHuman}
              disabled={!lastSnapshot}
              className="py-1.5 px-3 rounded-lg text-xs font-mono bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition flex items-center gap-1.5 disabled:opacity-40"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Snapshot as Human Scan</span>
            </button>
            <button
              onClick={captureAsSpoof}
              disabled={!lastSnapshot}
              className="py-1.5 px-3 rounded-lg text-xs font-mono bg-terracotta-500/20 hover:bg-terracotta-500/30 text-terracotta-300 border border-terracotta-500/40 transition flex items-center gap-1.5 disabled:opacity-40"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-terracotta-400" />
              <span>Snapshot as Spoof Scan</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column A: Living Biological Human */}
          <div className="glass-panel-cyan rounded-2xl p-5 border border-cyan-500/30 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
              <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-semibold uppercase">
                <ShieldCheck className="w-4 h-4" />
                <span>Reference Human Scan</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {humanSnapshot ? humanSnapshot.capturedAt : 'Awaiting Live Snapshot'}
              </span>
            </div>

            {humanSnapshot ? (
              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-mono font-bold text-cyan-400 text-glow-cyan">
                    {Math.round(humanSnapshot.authenticity_score * 100)}%
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
                    {humanSnapshot.verdict}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-obsidian-950 border border-white/5">
                    <span className="text-slate-400 block text-[10px]">HEART RATE</span>
                    <span className="text-white font-bold text-sm">
                      {humanSnapshot.heart_rate_bpm} BPM
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-obsidian-950 border border-white/5">
                    <span className="text-slate-400 block text-[10px]">HRV (RMSSD)</span>
                    <span className="text-white font-bold text-sm">
                      {humanSnapshot.hrv_rmssd_ms} ms
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-obsidian-950 border border-white/5">
                    <span className="text-slate-400 block text-[10px]">PHASE COHERENCE</span>
                    <span className="text-cyan-400 font-bold text-sm">
                      {humanSnapshot.vascular_coherence_percent}%
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-obsidian-950 border border-white/5">
                    <span className="text-slate-400 block text-[10px]">SIGNAL QUALITY (SQI)</span>
                    <span className="text-white font-bold text-sm">
                      {humanSnapshot.sqi_percent}%
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-slate-400 block mb-1">
                    BVP Photoplethysmogram Pulse Wave:
                  </span>
                  <BvpOscilloscope wave={humanSnapshot.bvp_wave} height={85} isLive={false} />
                </div>
              </div>
            ) : (
              <div className="text-center py-10 space-y-2">
                <Activity className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs font-mono text-slate-500">
                  Switch to Live Scanner, focus on genuine face, and click "Snapshot as Human Scan"
                </p>
              </div>
            )}
          </div>

          {/* Column B: Synthetic Spoof */}
          <div className="glass-panel-terracotta rounded-2xl p-5 border border-terracotta-500/30 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-terracotta-500/20">
              <div className="flex items-center gap-2 text-terracotta-400 font-mono text-xs font-semibold uppercase">
                <ShieldAlert className="w-4 h-4" />
                <span>Reference Spoof Scan (Phone/Video Replay)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {spoofSnapshot ? spoofSnapshot.capturedAt : 'Awaiting Live Snapshot'}
              </span>
            </div>

            {spoofSnapshot ? (
              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-mono font-bold text-terracotta-400 text-glow-terracotta">
                    {Math.round(spoofSnapshot.authenticity_score * 100)}%
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-terracotta-500/20 text-terracotta-300 border border-terracotta-500/40 uppercase">
                    {spoofSnapshot.verdict}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-obsidian-950 border border-white/5">
                    <span className="text-slate-400 block text-[10px]">HEART RATE</span>
                    <span className="text-white font-bold text-sm">
                      {spoofSnapshot.heart_rate_bpm > 0 ? `${spoofSnapshot.heart_rate_bpm} BPM` : 'NO CARDIAC LOCK'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-obsidian-950 border border-white/5">
                    <span className="text-slate-400 block text-[10px]">HRV (RMSSD)</span>
                    <span className="text-white font-bold text-sm">
                      {spoofSnapshot.hrv_rmssd_ms} ms
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-obsidian-950 border border-white/5">
                    <span className="text-slate-400 block text-[10px]">PHASE COHERENCE</span>
                    <span className="text-terracotta-400 font-bold text-sm">
                      {spoofSnapshot.vascular_coherence_percent}%
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-obsidian-950 border border-white/5">
                    <span className="text-slate-400 block text-[10px]">SIGNAL QUALITY (SQI)</span>
                    <span className="text-white font-bold text-sm">
                      {spoofSnapshot.sqi_percent}%
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-slate-400 block mb-1">
                    BVP Photoplethysmogram Pulse Wave:
                  </span>
                  <BvpOscilloscope wave={spoofSnapshot.bvp_wave} height={85} isLive={false} />
                </div>
              </div>
            ) : (
              <div className="text-center py-10 space-y-2">
                <ShieldAlert className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs font-mono text-slate-500">
                  Hold a smartphone playing a video in front of camera, then click "Snapshot as Spoof Scan"
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

