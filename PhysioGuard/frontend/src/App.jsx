import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LiveScanner from './components/LiveScanner';
import ForensicLab from './components/ForensicLab';
import BenchmarkSuite from './components/BenchmarkSuite';
import StageDemo from './components/StageDemo';
import { fetchHealth, fetchBenchmarks } from './utils/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('live');
  const [health, setHealth] = useState(null);
  const [threshold, setThreshold] = useState(0.6258);
  const [optimalThreshold, setOptimalThreshold] = useState(0.6258);
  const [lastSnapshot, setLastSnapshot] = useState(null);

  useEffect(() => {
    // Initial health check
    fetchHealth()
      .then((data) => {
        setHealth(data);
        if (data.optimal_liveness_threshold) {
          setThreshold(data.optimal_liveness_threshold);
          setOptimalThreshold(data.optimal_liveness_threshold);
        }
      })
      .catch((err) => console.warn('Backend offline or health error:', err));

    // Also fetch benchmarks to sync optimal threshold
    fetchBenchmarks()
      .then((data) => {
        if (data.optimal_liveness_threshold) {
          setThreshold(data.optimal_liveness_threshold);
          setOptimalThreshold(data.optimal_liveness_threshold);
        }
      })
      .catch((err) => console.warn('Benchmark fetch error:', err));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#080B11] text-slate-100">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        health={health}
        threshold={threshold}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'live' && (
          <LiveScanner
            currentThreshold={threshold}
            onSnapshot={(snap) => setLastSnapshot(snap)}
          />
        )}

        {activeTab === 'lab' && (
          <ForensicLab currentThreshold={threshold} />
        )}

        {activeTab === 'benchmarks' && (
          <BenchmarkSuite />
        )}

        {activeTab === 'stage' && (
          <StageDemo
            threshold={threshold}
            setThreshold={setThreshold}
            optimalThreshold={optimalThreshold}
            lastSnapshot={lastSnapshot}
          />
        )}
      </main>

      {/* Cyber-Forensic Footer */}
      <footer className="w-full border-t border-white/5 py-4 bg-obsidian-950/80 text-[11px] font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div>
            PhysioGuard Biometric Telemetry &bull; Multi-Region 3D Spatio-Temporal rPPG &bull; MediaPipe 468-Landmark
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Youden Optimal: {optimalThreshold.toFixed(4)}</span>
            <span className="text-cyan-400">&bull;</span>
            <span>FastAPI + ONNXRuntime Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
