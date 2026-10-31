import React, { useEffect, useRef } from 'react';

export default function PsdSpectrum({ freqs = [], powers = [], peakBpm = null, height = 140 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // 1. Background
    ctx.fillStyle = '#080B11';
    ctx.fillRect(0, 0, w, h);

    // 2. Grid & Axis markings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    // Freq reference lines for 60, 90, 120, 150, 180 BPM
    const bpmMarks = [60, 90, 120, 150, 180];
    const minBpm = 45;
    const maxBpm = 195;
    const bpmRange = maxBpm - minBpm;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';

    bpmMarks.forEach((bpm) => {
      const x = ((bpm - minBpm) / bpmRange) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h - 18);
      ctx.stroke();
      ctx.fillText(`${bpm}`, x, h - 4);
    });

    // 3. Draw PSD Curve
    if (freqs && powers && freqs.length > 2 && powers.length > 2) {
      const len = freqs.length;
      let maxP = 0;
      for (let i = 0; i < len; i++) {
        if (powers[i] > maxP) maxP = powers[i];
      }
      if (maxP === 0) maxP = 1.0;

      // Area fill
      const grad = ctx.createLinearGradient(0, 0, 0, h - 18);
      grad.addColorStop(0, 'rgba(0, 240, 255, 0.25)');
      grad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(0, h - 18);
      for (let i = 0; i < len; i++) {
        const normX = (freqs[i] - minBpm) / bpmRange;
        const x = Math.max(0, Math.min(w, normX * w));
        const normY = powers[i] / maxP;
        const y = (h - 22) - normY * (h - 32);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h - 18);
      ctx.closePath();
      ctx.fill();

      // Stroke line
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const normX = (freqs[i] - minBpm) / bpmRange;
        const x = Math.max(0, Math.min(w, normX * w));
        const normY = powers[i] / maxP;
        const y = (h - 22) - normY * (h - 32);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw peak vertical indicator & marker
      if (peakBpm && peakBpm >= minBpm && peakBpm <= maxBpm) {
        const peakX = ((peakBpm - minBpm) / bpmRange) * w;
        ctx.save();
        ctx.strokeStyle = '#00F0FF';
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(peakX, 10);
        ctx.lineTo(peakX, h - 18);
        ctx.stroke();

        ctx.fillStyle = '#00F0FF';
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(peakX, 12, 4, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#00F0FF';
        ctx.textAlign = peakX > w - 40 ? 'right' : 'left';
        ctx.fillText(` ${peakBpm.toFixed(1)} BPM`, peakX + 4, 15);
        ctx.restore();
      }
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('WELCH FFT SPECTRUM STANDBY...', w / 2, h / 2);
    }
  }, [freqs, powers, peakBpm, height]);

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

