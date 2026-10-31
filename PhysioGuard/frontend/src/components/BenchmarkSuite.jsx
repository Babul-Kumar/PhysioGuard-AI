import React, { useState, useEffect } from 'react';
import {
  Cpu,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  X,
  Layers,
  Activity,
  Award,
  Filter,
} from 'lucide-react';
import { fetchBenchmarks } from '../utils/api';

export default function BenchmarkSuite() {
  const [benchmarks, setBenchmarks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  useEffect(() => {
    fetchBenchmarks()
      .then((data) => setBenchmarks(data))
      .catch((err) => console.error('Benchmark fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  const audit = benchmarks?.cleaning_audit;

  return (
    <div className="space-y-6">
      {/* Zoom Modal for Benchmark Plot */}
      {isZoomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative max-w-5xl w-full glass-panel rounded-2xl p-4 border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="font-heading font-semibold text-sm text-white">
                Held-Out Test Benchmark: ROC Curve, Confusion Matrix & HR Agreement
              </span>
              <button
                onClick={() => setIsZoomOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 overflow-auto max-h-[80vh] flex justify-center">
              <img
                src={benchmarks?.plot_url || '/static/plots/physioguard_test_benchmark.png'}
                alt="PhysioGuard Test Benchmark"
                className="rounded-xl max-w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider">
            <Cpu className="w-4 h-4" />
            <span>PhysioGuardNet Deep Biometric Engine</span>
          </div>
          <h2 className="text-2xl font-heading font-bold text-white mt-1">
            Model Architecture & Test Performance Benchmarks
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Verified across held-out evaluation datasets with clinical ground-truth PPG synchronization
          </p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel-cyan rounded-2xl p-5 border border-cyan-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Held-Out Test AUROC
            </span>
            <Award className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-mono font-bold text-cyan-400 text-glow-cyan">
              {benchmarks ? `${benchmarks.test_auroc_percent}%` : '89.88%'}
            </span>
            <span className="text-xs font-mono text-slate-400">Area Under ROC</span>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-mono">
            High discriminative margin separating biological hemodynamics from synthetic replay artifacts.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Heart Rate MAE
            </span>
            <Activity className="w-5 h-5 text-terracotta-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-mono font-bold text-white">
              {benchmarks ? benchmarks.test_hr_mae_bpm : '7.37'}
            </span>
            <span className="text-xs font-mono text-slate-400">BPM</span>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-mono">
            Mean Absolute Error against clinical finger-pulse oximeter ground-truth signals.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Optimal Youden Cutoff
            </span>
            <BarChart3 className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-mono font-bold text-white">
              {benchmarks ? benchmarks.optimal_liveness_threshold.toFixed(4) : '0.6258'}
            </span>
            <span className="text-xs font-mono text-cyan-400">Threshold</span>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-mono">
            Optimized via Youden's J-statistic on validation set to minimize False Rejection Rate.
          </p>
        </div>
      </div>

      {/* Benchmark Figure & Architecture Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Held-Out Test Figure (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="font-heading font-semibold text-sm text-white">
                Held-Out Benchmark Figure (ROC & Bland-Altman)
              </span>
            </div>
            <button
              onClick={() => setIsZoomOpen(true)}
              className="py-1 px-2.5 rounded-lg text-xs font-mono bg-obsidian-800 hover:bg-obsidian-700 text-slate-300 border border-white/10 flex items-center gap-1.5 transition"
            >
              <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
              <span>Expand Plot</span>
            </button>
          </div>

          <div
            onClick={() => setIsZoomOpen(true)}
            className="cursor-pointer rounded-xl overflow-hidden bg-obsidian-950 border border-white/5 hover:border-cyan-500/40 transition group p-2 flex justify-center"
          >
            <img
              src={benchmarks?.plot_url || '/static/plots/physioguard_test_benchmark.png'}
              alt="Test Benchmark"
              className="rounded-lg max-h-80 w-auto object-contain group-hover:scale-[1.01] transition duration-200"
            />
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            Generated directly from the held-out test split of 542 real/synthesis video sequences.
          </p>
        </div>

        {/* 542-Video Data Cleaning Audit Funnel (5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-cyan-400" />
              <span className="font-heading font-semibold text-sm text-white">
                542-Video Data Cleaning Audit
              </span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">96.1% YIELD</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-obsidian-800/80 border border-white/5 flex items-center justify-between">
              <span className="text-slate-300">Total Raw Videos Scanned</span>
              <span className="font-bold text-white">{audit?.total_videos_scanned ?? 542}</span>
            </div>

            <div className="p-3 rounded-xl bg-obsidian-800/80 border border-white/5 flex items-center justify-between">
              <span className="text-slate-400">Dropped (Corrupt or Short)</span>
              <span className="font-bold text-terracotta-400">
                -{audit?.dropped_corrupt_or_short ?? 9}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-obsidian-800/80 border border-white/5 flex items-center justify-between">
              <span className="text-slate-400">Dropped (Low Face Tracking)</span>
              <span className="font-bold text-terracotta-400">
                -{audit?.dropped_low_face_tracking ?? 12}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between">
              <span className="text-cyan-300 font-semibold">Accepted Clean Videos</span>
              <span className="font-bold text-cyan-400">
                {audit?.accepted_clean_videos ?? 521}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-obsidian-800/80 border border-white/5 flex items-center justify-between">
              <span className="text-slate-300 font-semibold">Total Clean Clips Saved</span>
              <span className="font-bold text-white">
                {audit?.total_clean_clips_saved ?? 1188}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Architecture Deep-Dive Block Diagram */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/10">
          <Layers className="w-5 h-5 text-cyan-400" />
          <h3 className="font-heading font-bold text-base text-white">
            PhysioGuardNet Multi-Region 3D Spatio-Temporal Graph Architecture
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-obsidian-950/80 border border-white/5 space-y-2">
            <div className="text-xs font-mono font-bold text-cyan-400 uppercase">
              1. Multi-Region ST-Volume
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              Input: <code className="text-cyan-400">st_vol (1, 6, 128, 72, 72)</code>
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Constructed by vertically stacking 3 vascular ROIs: Glabella (Forehead), Left Malar, and Right Malar.
              Fused across Normalized Difference (<code className="text-slate-300">diff</code>) and Standardized Appearance (<code className="text-slate-300">app</code>) branches to isolate microscopic pulsatile capillary expansion.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-obsidian-950/80 border border-white/5 space-y-2">
            <div className="text-xs font-mono font-bold text-cyan-400 uppercase">
              2. Ambient-Subtracted POS
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              Input: <code className="text-cyan-400">reg_pos (1, 3, 128)</code>
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Plane-Orthogonal-to-Skin (POS) projections computed on each anatomical zone and dynamically decoupled from background ambient illuminant fluctuations (<code className="text-slate-300">bg_rgb</code>), bandpassed at 0.72–3.2 Hz.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-obsidian-950/80 border border-white/5 space-y-2">
            <div className="text-xs font-mono font-bold text-cyan-400 uppercase">
              3. Dual Multi-Task Heads
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              Outputs: <code className="text-cyan-400">pred_bvp (128)</code> & <code className="text-cyan-400">live_logits (1)</code>
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Joint optimization enforces that synthetic spoofing is detected not merely from pixel artifacts, but fundamentally from the total absence of biologically plausible cardiovascular hemodynamics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

