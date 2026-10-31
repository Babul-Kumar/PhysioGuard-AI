import React, { useEffect, useRef } from 'react';

export default function BvpOscilloscope({ wave = [], height = 140, isLive = true }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Adjust canvas resolution for retina displays
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // 1. Draw Obsidian Dark Background
    ctx.fillStyle = '#080B11';
    ctx.fillRect(0, 0, w, h);

    // 2. Draw Clinical Medical Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSpacing = 24;
    for (let x = 0; x < w; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Baseline axis
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // 3. Draw BVP Photoplethysmogram Trace
    if (wave && wave.length > 2) {
      const len = wave.length;
      // Find min and max for normalization
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < len; i++) {
        if (wave[i] < min) min = wave[i];
        if (wave[i] > max) max = wave[i];
      }
      const range = max - min > 1e-4 ? max - min : 1.0;

      // Draw subtle glow shadow
      ctx.save();
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2.0;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const x = (i / (len - 1)) * w;
        // Invert Y so positive pulse peaks go upward
        const normY = (wave[i] - min) / range;
        const y = h - (normY * (h - 24) + 12);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // Draw faint gradient under the pulse wave
      ctx.save();
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(0, 240, 255, 0.15)');
      grad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const x = (i / (len - 1)) * w;
        const normY = (wave[i] - min) / range;
        const y = h - (normY * (h - 24) + 12);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Draw live scanning leading edge point
      if (isLive) {
        const lastX = w;
        const lastNormY = (wave[len - 1] - min) / range;
        const lastY = h - (lastNormY * (h - 24) + 12);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(lastX - 2, lastY, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Waiting for buffer trace
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CALIBRATING VASCULAR TRACE (RING BUFFER LOCKING)...', w / 2, h / 2 + 4);
    }
  }, [wave, height, isLive]);

  return (
    <div className="w-full relative rounded-lg overflow-hidden border border-white/5 bg-[#080B11]">
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: `${height}px` }}
        className="block"
      />
    </div>
  );
}

