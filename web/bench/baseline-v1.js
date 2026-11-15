// The first version of the analysis, kept only so bench.js can compare v2 against it.

// Autocorrelation pitch detector: picks the first strong local peak
// (fundamental period) with parabolic interpolation for precision.
function detectPitch(frame, sr) {
  const n = frame.length;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += frame[i];
  mean /= n;
  const buf = new Float32Array(n);
  let e0 = 0;
  for (let i = 0; i < n; i++) { buf[i] = frame[i] - mean; e0 += buf[i] * buf[i]; }
  if (e0 < 1e-7) return { freq: 0, clarity: 0 };
  const minLag = Math.max(2, Math.floor(sr / 1400));
  const maxLag = Math.min(n - 2, Math.floor(sr / 70));
  const norms = new Float32Array(maxLag + 2);
  let best = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let c = 0;
    for (let i = 0; i < n - lag; i++) c += buf[i] * buf[i + lag];
    const norm = c / (e0 * (n - lag) / n);
    norms[lag] = norm;
    if (norm > best) best = norm;
  }
  if (best < 0.3) return { freq: 0, clarity: Math.max(0, best) };
  let chosen = -1;
  for (let l = minLag + 1; l < maxLag; l++) {
    if (norms[l] > 0.9 * best && norms[l] >= norms[l - 1] && norms[l] >= norms[l + 1]) { chosen = l; break; }
  }
  if (chosen < 0) return { freq: 0, clarity: best };
  let lag = chosen;
  const a = norms[chosen - 1], b = norms[chosen], c2 = norms[chosen + 1];
  const den = a - 2 * b + c2;
  if (Math.abs(den) > 1e-9) {
    const d = 0.5 * (a - c2) / den;
    if (Math.abs(d) < 1) lag = chosen + d;
  }
  return { freq: sr / lag, clarity: best };
}

// ------------------------------------------------------------------
// Feature extraction & classification (Translate tab)
// ------------------------------------------------------------------

const ANALYSIS_SR = 16000;

function extractFeatures(x, sr) {
  const N = 1024, HOP = 512;
  const win = hann(N);
  const frames = [];
  for (let s = 0; s + N <= x.length; s += HOP) {
    let sum = 0;
    for (let i = 0; i < N; i++) { const v = x[s + i]; sum += v * v; }
    frames.push({ s, rms: Math.sqrt(sum / N) });
  }
  const empty = {
    maxRms: 0, numSeg: 0, totalVoiced: 0, avgSegDur: 0, longestSeg: 0,
    medianPitch: 0, contour: 1, contourWord: "steady", pitchVar: 0,
    avgFlat: 0, avgCentroid: 0, avgLowRatio: 0, avgClarity: 0, loudWord: "soft",
  };
  if (!frames.length) return empty;
  let maxRms = 0;
  frames.forEach((f) => { if (f.rms > maxRms) maxRms = f.rms; });
  const thr = Math.max(0.006, maxRms * 0.18);
  const wbuf = new Float32Array(N);
  for (const f of frames) {
    f.voiced = f.rms >= thr && f.rms > 0.004;
    if (!f.voiced) continue;
    for (let i = 0; i < N; i++) wbuf[i] = x[f.s + i] * win[i];
    const mags = fftMag(wbuf);
    const loBin = Math.max(1, Math.round((60 * N) / sr));
    const hiBin = Math.min(mags.length - 1, Math.round((7500 * N) / sr));
    const lowCut = Math.round((320 * N) / sr);
    let logSum = 0, sum = 0, cnt = 0, wsum = 0, lowSum = 0;
    for (let i = loBin; i <= hiBin; i++) {
      const m = mags[i] + 1e-9;
      logSum += Math.log(m); sum += m; cnt++;
      wsum += ((i * sr) / N) * m;
      if (i <= lowCut) lowSum += m;
    }
    f.flat = Math.exp(logSum / cnt) / (sum / cnt);
    f.centroid = wsum / sum;
    f.lowR = lowSum / sum;
    const p = detectPitch(x.subarray(f.s, f.s + N), sr);
    f.pf = p.freq; f.pc = p.clarity;
  }
  const frameDur = HOP / sr;
  const segs = [];
  let cur = null, gap = 0;
  frames.forEach((f) => {
    if (f.voiced) {
      if (!cur) cur = { count: 1 };
      else cur.count += gap + 1;
      gap = 0;
    } else if (cur) {
      gap++;
      if (gap * frameDur > 0.14) { segs.push(cur); cur = null; gap = 0; }
    }
  });
  if (cur) segs.push(cur);
  const kept = segs.filter((sg) => sg.count * frameDur >= 0.06);
  const durs = kept.map((sg) => sg.count * frameDur);
  const totalVoiced = durs.reduce((a, b) => a + b, 0);
  const vFrames = frames.filter((f) => f.voiced && f.flat !== undefined);
  const pitched = vFrames.filter((f) => f.pf > 0 && f.pc > 0.45).map((f) => f.pf);
  const medianPitch = median(pitched);
  const k = Math.max(1, Math.floor(pitched.length * 0.4));
  const pStart = median(pitched.slice(0, k));
  const pEnd = median(pitched.slice(-k));
  const contour = pStart > 0 && pEnd > 0 ? pEnd / pStart : 1;
  const p25 = quantile(pitched, 0.25), p75 = quantile(pitched, 0.75);
  return {
    maxRms,
    numSeg: kept.length,
    totalVoiced,
    avgSegDur: kept.length ? totalVoiced / kept.length : 0,
    longestSeg: durs.length ? Math.max(...durs) : 0,
    medianPitch,
    contour,
    contourWord: contour > 1.08 ? "rising" : contour < 0.93 ? "falling" : "steady",
    pitchVar: medianPitch > 0 ? (p75 - p25) / medianPitch : 0,
    avgFlat: avg(vFrames.map((f) => f.flat)),
    avgCentroid: avg(vFrames.map((f) => f.centroid)),
    avgLowRatio: avg(vFrames.map((f) => f.lowR)),
    avgClarity: avg(vFrames.map((f) => f.pc || 0)),
    loudWord: maxRms < 0.035 ? "soft" : maxRms < 0.13 ? "medium" : "loud",
  };
}

function classify(f) {
  const j = () => Math.random() * 0.06;
  if (!f.numSeg || f.maxRms < 0.008 || f.totalVoiced < 0.05) return { key: "quiet", conf: 0.9 };
  if (f.avgFlat > 0.3 && f.avgClarity < 0.45) return { key: "hiss", conf: 0.78 + j() };
  if (f.avgLowRatio > 0.55 && f.avgCentroid < 520 && f.totalVoiced > 0.85) return { key: "purr", conf: 0.84 + j() };
  if (f.numSeg >= 4 && f.avgSegDur < 0.28) return { key: "chatter", conf: 0.72 + j() };
  const p = f.medianPitch;
  if (p > 0) {
    if (f.totalVoiced > 1.35 && p >= 250 && p <= 950 && f.pitchVar > 0.12 && f.loudWord !== "soft")
      return { key: "yowl", conf: 0.68 + j() };
    if (f.longestSeg < 0.65 && f.contour > 1.12 && p > 420) return { key: "trill", conf: 0.7 + j() };
    if (p >= 240 && p <= 1250 && f.longestSeg >= 0.15) {
      if (p >= 660) return { key: "meow_hungry", conf: 0.7 + j() };
      if (f.contour >= 1.08) return { key: "meow_question", conf: 0.68 + j() };
      if (f.contour <= 0.92 && p < 470) return { key: "meow_grumpy", conf: 0.66 + j() };
      if (f.longestSeg < 0.35) return { key: "meow_hi", conf: 0.66 + j() };
      return { key: "meow_chat", conf: 0.66 + j() };
    }
    if (p < 240) return { key: "grumble", conf: 0.6 + j() };
  }
  return { key: "mystery", conf: 0.5 + j() };
}

