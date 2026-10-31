import React from 'react';
import { Activity, ShieldCheck, Film, Cpu, Sliders, Wifi, WifiOff } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, health, threshold }) {
  const isOnline = health?.status === 'ok';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#080B11]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-obsidian-800 border border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-500/10">
            <Activity className="w-5 h-5 animate-pulse text-cyan-400" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-lg tracking-wider text-white">
                PHYSIO<span className="text-cyan-400">GUARD</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 uppercase">
                ONNX v1.0
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block tracking-tight font-mono">
              Contactless Cardiovascular Telemetry & Forensic Defense
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 bg-obsidian-800/80 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'live'
                ? 'bg-cyan-500 text-black shadow-md font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Live Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab('lab')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'lab'
                ? 'bg-cyan-500 text-black shadow-md font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Forensic Lab</span>
          </button>

          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'benchmarks'
                ? 'bg-cyan-500 text-black shadow-md font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Benchmarks</span>
          </button>

          <button
            onClick={() => setActiveTab('stage')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'stage'
                ? 'bg-cyan-500 text-black shadow-md font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Stage Demo</span>
          </button>
        </nav>

        {/* Status Pills */}
        <div className="flex items-center gap-3">
          {/* Threshold Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-obsidian-800 border border-white/5 text-[11px] font-mono text-slate-300">
            <span className="text-slate-500">Threshold:</span>
            <span className="text-cyan-400 font-semibold">{threshold.toFixed(4)}</span>
          </div>

          {/* Engine Health Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono ${
              isOnline
                ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-400'
                : 'bg-terracotta-950/30 border-terracotta-500/30 text-terracotta-400'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CPU ONNX ({health.onnx_latency_ms}ms)</span>
                <span className="sm:hidden">ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>OFFLINE</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

