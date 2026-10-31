import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, Zap, X, RefreshCw } from 'lucide-react';
import { verifyFlashChallenge } from '../utils/api';

export default function FlashChallengeModal({ isOpen, onClose, videoRef, onResult }) {
  const [phase, setPhase] = useState('idle'); // 'idle' | 'flashing' | 'analyzing' | 'complete'
  const [flashColor, setFlashColor] = useState('#00F0FF');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setPhase('idle');
      setResult(null);
      setError(null);
      setProgress(0);
    }
  }, [isOpen]);

  const startChallenge = async () => {
    if (!videoRef || !videoRef.current) {
      setError('Webcam stream unavailable.');
      return;
    }

    setPhase('flashing');
    setError(null);
    setProgress(0);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');

    const frames = [];
    const totalDuration = 1500; // 1.5s
    const interval = 150; // capture ~10 frames
    const startTime = Date.now();

    const flashInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1.0, elapsed / totalDuration);
      setProgress(Math.round(t * 100));

      // Interpolate from Cyan (#00F0FF -> rgb(0, 240, 255)) to Terracotta (#E05A47 -> rgb(224, 90, 71))
      const r = Math.round(0 + t * 224);
      const g = Math.round(240 - t * (240 - 90));
      const b = Math.round(255 - t * (255 - 71));
      setFlashColor(`rgb(${r}, ${g}, ${b})`);

      // Grab current video frame
      try {
        ctx.drawImage(video, 0, 0, 320, 240);
        const b64 = canvas.toDataURL('image/jpeg', 0.8);
        frames.push({
          timestamp_ms: elapsed,
          base64_image: b64,
        });
      } catch (err) {
        console.warn('Frame capture error:', err);
      }

      if (elapsed >= totalDuration) {
        clearInterval(flashInterval);
        setPhase('analyzing');
        submitFrames(frames);
      }
    }, interval);
  };

  const submitFrames = async (frames) => {
    try {
      const res = await verifyFlashChallenge(frames);
      setResult(res);
      setPhase('complete');
      if (onResult) onResult(res);
    } catch (err) {
      setError(err.message || 'Challenge analysis failed.');
      setPhase('idle');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      {/* Active Fullscreen Illumination Flash during execution */}
      {phase === 'flashing' && (
        <div
          className="fixed inset-0 pointer-events-none transition-colors duration-75 z-40 opacity-40 mix-blend-screen"
          style={{ backgroundColor: flashColor }}
        />
      )}

      <div className="relative z-50 w-full max-w-lg glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-lg text-white">Active 3D Presence Replay Challenge</h3>
              <p className="text-xs text-slate-400">Cyan-to-Terracotta Chromatic Sweep (Anti-Screen Spoof)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-6 space-y-5">
          {phase === 'idle' && (
            <div className="space-y-4 text-center">
              <div className="p-4 rounded-xl bg-obsidian-800 border border-white/5 text-left text-sm text-slate-300 space-y-2">
                <p className="font-medium text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  How this defeats iPad / Phone Video Replays:
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The screen will emit a calibrated 1.5-second illumination sweep (Cyan 490nm &rarr; Terracotta 600nm).
                  Real human skin exhibits 3D nasal cartilage curvature and differential hemoglobin absorption.
                  A 2D replay screen reflects flat, planar specular light with zero subsurface tissue scatter.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-terracotta-900/40 border border-terracotta-500/40 text-terracotta-400 text-xs">
                  {error}
                </div>
              )}

              <button
                onClick={startChallenge}
                className="w-full py-3.5 px-6 rounded-xl font-heading font-semibold text-sm bg-gradient-to-r from-cyan-500 to-cyan-400 text-black shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-[0.99] transition"
              >
                Launch 1.5s Chromatic Flash
              </button>
            </div>
          )}

          {phase === 'flashing' && (
            <div className="text-center py-8 space-y-4">
              <div
                className="w-20 h-20 mx-auto rounded-full flex items-center justify-center border-4 shadow-xl transition-all duration-100"
                style={{
                  borderColor: flashColor,
                  boxShadow: `0 0 35px ${flashColor}`,
                  backgroundColor: `${flashColor}22`,
                }}
              >
                <Zap className="w-8 h-8 text-white animate-spin" />
              </div>
              <p className="text-sm font-mono text-cyan-400 tracking-wider">
                EMITTING CHROMATIC SWEEP ({progress}%)
              </p>
              <p className="text-xs text-slate-400">Keep face still looking directly at the display</p>
              <div className="w-full bg-obsidian-700 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-150"
                  style={{ width: `${progress}%`, backgroundColor: flashColor }}
                />
              </div>
            </div>
          )}

          {phase === 'analyzing' && (
            <div className="text-center py-8 space-y-3">
              <RefreshCw className="w-10 h-10 mx-auto text-cyan-400 animate-spin" />
              <p className="text-sm font-mono text-white">ANALYZING 3D SPECULAR REFLECTION VECTORS...</p>
              <p className="text-xs text-slate-400">Comparing nasal bridge vs peripheral planar specular response</p>
            </div>
          )}

          {phase === 'complete' && result && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border flex items-center gap-4 ${
                  result.passed
                    ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300'
                    : 'bg-terracotta-950/40 border-terracotta-500/50 text-terracotta-300'
                }`}
              >
                {result.passed ? (
                  <ShieldCheck className="w-10 h-10 text-cyan-400 shrink-0" />
                ) : (
                  <ShieldAlert className="w-10 h-10 text-terracotta-400 shrink-0" />
                )}
                <div>
                  <div className="font-heading font-bold text-base tracking-wide">
                    {result.verdict}
                  </div>
                  <div className="text-xs text-slate-300 mt-1 leading-relaxed">{result.message}</div>
                </div>
              </div>

              {/* Metrics table */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-obsidian-800 border border-white/5">
                  <div className="text-[11px] text-slate-400 uppercase font-mono">3D Specular Ratio</div>
                  <div className="text-lg font-mono font-bold text-white mt-0.5">
                    {result.specular_3d_ratio}x
                  </div>
                  <div className="text-[10px] text-slate-400">Threshold: &ge; 1.10x</div>
                </div>
                <div className="p-3 rounded-lg bg-obsidian-800 border border-white/5">
                  <div className="text-[11px] text-slate-400 uppercase font-mono">Chromatic Delta</div>
                  <div className="text-lg font-mono font-bold text-white mt-0.5">
                    {result.chromatic_delta}
                  </div>
                  <div className="text-[10px] text-slate-400">Threshold: &ge; 10.0</div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setPhase('idle')}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-mono bg-obsidian-800 hover:bg-obsidian-700 text-slate-200 border border-white/10 transition"
                >
                  Test Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-mono bg-cyan-500 hover:bg-cyan-400 text-black font-semibold transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

