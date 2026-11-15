

/*
  Meowchi 🐾 — kawaii kitty translator & summoner
  - Translate: records your cat, extracts real acoustic features (pitch,
    rhythm, noisiness), classifies the sound, and asks Claude to write a
    playful "translation".
  - Call Kitty: plays synthesized cat-attracting sounds (pspsps, purring,
    birds, mouse squeaks, kitten mews, treat-bag crinkle).
  Just for fun & bonding — not veterinary science!
*/

// ------------------------------------------------------------------
// DSP utilities
// ------------------------------------------------------------------

function fftMag(input) {
  const n = input.length; // power of 2
  const re = Float32Array.from(input);
  const im = new Float32Array(n);
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j |= bit;
    if (i < j) { const t = re[i]; re[i] = re[j]; re[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < half; k++) {
        const are = re[i + k], aim = im[i + k];
        const bre = re[i + k + half], bim = im[i + k + half];
        const tr = bre * cr - bim * ci;
        const ti = bre * ci + bim * cr;
        re[i + k] = are + tr; im[i + k] = aim + ti;
        re[i + k + half] = are - tr; im[i + k + half] = aim - ti;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
  const half = n >> 1;
  const mags = new Float32Array(half);
  for (let i = 0; i < half; i++) mags[i] = Math.hypot(re[i], im[i]) / n;
  return mags;
}

function biquadFilter(data, sr, type, f0, Q) {
  const w0 = 2 * Math.PI * f0 / sr, cw = Math.cos(w0), sw = Math.sin(w0);
  const alpha = sw / (2 * Q);
  let b0, b1, b2;
  if (type === "lowpass") { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; }
  else if (type === "highpass") { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; }
  else { b0 = alpha; b1 = 0; b2 = -alpha; } // bandpass, 0 dB peak
  const a0 = 1 + alpha, a1 = -2 * cw, a2 = 1 - alpha;
  const nb0 = b0 / a0, nb1 = b1 / a0, nb2 = b2 / a0, na1 = a1 / a0, na2 = a2 / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const x = data[i];
    const y = nb0 * x + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y; out[i] = y;
  }
  return out;
}


function resampleTo(data, srIn, srOut) {
  if (srIn === srOut) return data;
  let src = data;
  if (srOut < srIn) {
    src = biquadFilter(data, srIn, "lowpass", srOut * 0.45, 0.707);
    src = biquadFilter(src, srIn, "lowpass", srOut * 0.45, 0.707);
  }
  const ratio = srIn / srOut;
  const outLen = Math.floor(data.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio, i0 = Math.floor(pos), frac = pos - i0;
    const a = src[i0] || 0;
    const b = src[i0 + 1] !== undefined ? src[i0 + 1] : a;
    out[i] = a + (b - a) * frac;
  }
  return out;
}

let hannCache = null;
function hann(n) {
  if (hannCache && hannCache.length === n) return hannCache;
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  hannCache = w;
  return w;
}

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function quantile(arr, q) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))));
  return s[idx];
}
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

