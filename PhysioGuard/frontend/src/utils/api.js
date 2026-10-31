// PhysioGuard API client helpers

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchBenchmarks() {
  const res = await fetch(`${API_BASE}/benchmarks`);
  if (!res.ok) throw new Error(`Benchmark fetch failed: ${res.statusText}`);
  return res.json();
}

export async function analyzeVideo(file, thresholdOverride = null) {
  const formData = new FormData();
  formData.append('file', file);
  let url = `${API_BASE}/analyze-video`;
  if (thresholdOverride !== null && thresholdOverride !== undefined) {
    url += `?threshold_override=${thresholdOverride}`;
  }
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Video analysis failed with status ${res.status}`);
  }
  return res.json();
}

export async function verifyFlashChallenge(frames) {
  const res = await fetch(`${API_BASE}/verify-flash-challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frames }),
  });
  if (!res.ok) throw new Error(`Flash challenge failed: ${res.statusText}`);
  return res.json();
}

export function getWebSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/ws/live-telemetry`;
}

