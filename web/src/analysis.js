// ------------------------------------------------------------------
// Analysis v2: noise-aware segmentation, YIN pitch tracking with octave repair,
// purr-pulse (amplitude modulation) detection, and a scored classifier whose
// confidence comes from how clearly the best match beats the runner-up.
// ------------------------------------------------------------------

const CLIP_SR = 16000;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const up = (x, a, b) => clamp01((x - a) / (b - a));
const down = (x, a, b) => 1 - up(x, a, b);
const band = (x, a, b, c, d) => Math.min(up(x, a, b), down(x, c, d));
const semis = (ratio) => 12 * Math.log2(ratio);

// YIN (de Cheveigne & Kawahara): difference function, cumulative-mean normalisation,
// first dip under threshold, parabolic refinement. Returns 0 Hz when unvoiced.
function yinPitch(x, start, N, sr, minHz, maxHz) {
  const maxLag = Math.min(Math.floor(sr / minHz), (N >> 1) - 1);
  const minLag = Math.max(2, Math.floor(sr / maxHz));
  const W = N - maxLag;
  const c = new Float32Array(maxLag + 1);
  c[0] = 1;
  let run = 0;
  for (let tau = 1; tau <= maxLag; tau++) {
    let sum = 0;
    for (let j = 0; j < W; j++) { const d = x[start + j] - x[start + j + tau]; sum += d * d; }
    run += sum;
    c[tau] = run > 0 ? (sum * tau) / run : 1;
  }
  let tau = -1;
  for (let t = minLag; t < maxLag; t++) {
    if (c[t] < 0.15) { while (t + 1 < maxLag && c[t + 1] < c[t]) t++; tau = t; break; }
  }
  if (tau < 0) {
    let best = 1e9;
    for (let t = minLag; t < maxLag; t++) if (c[t] < best) best = c[t];
    if (best > 0.45) return { freq: 0, clarity: clamp01(1 - best) };
    // shortest lag that is nearly as good as the best one: avoids locking onto a multiple of the period
    for (let t = minLag + 1; t < maxLag - 1; t++) {
      if (c[t] < best + 0.08 && c[t] <= c[t - 1] && c[t] <= c[t + 1]) { tau = t; break; }
    }
    if (tau < 0) return { freq: 0, clarity: clamp01(1 - best) };
  }
  let lag = tau;
  if (tau > 1 && tau < maxLag) {
    const a = c[tau - 1], b = c[tau], d2 = c[tau + 1], den = a - 2 * b + d2;
    if (Math.abs(den) > 1e-9) { const sh = 0.5 * (a - d2) / den; if (Math.abs(sh) < 1) lag = tau + sh; }
  }
  return { freq: sr / lag, clarity: clamp01(1 - c[tau]) };
}

// Strength and rate of the 15-40 Hz pulsing that marks a purr (and the roll in a trill).
function pulseAnalysis(x, s0, s1, sr) {
  const STEP = 64, WIN = 256, w = hann(WIN);
  const env = [];
  for (let s = s0; s + WIN <= s1; s += STEP) {
    let sum = 0, ws = 0;
    for (let i = 0; i < WIN; i++) { const v = x[s + i]; sum += v * v * w[i]; ws += w[i]; }
    env.push(Math.sqrt(sum / ws));
  }
  const n = env.length;
  if (n < 40) return { rate: 0, share: 0, depth: 0 };
  let mean = 0;
  for (let i = 0; i < n; i++) mean += env[i];
  mean /= n;
  if (mean < 1e-6) return { rate: 0, share: 0, depth: 0 };
  // remove the slow loudness contour (0.25 s moving average) so only fast pulsing is left
  const half = Math.round((0.125 * sr) / STEP);
  const fast = new Float32Array(n);
  let varSum = 0;
  for (let i = 0; i < n; i++) {
    let a = 0, cnt = 0;
    for (let k = Math.max(0, i - half); k <= Math.min(n - 1, i + half); k++) { a += env[k]; cnt++; }
    fast[i] = (env[i] - a / cnt) / mean;
    varSum += fast[i] * fast[i];
  }
  const depth = Math.sqrt(varSum / n);
  let size = 128;
  while (size < n && size < 1024) size <<= 1;
  const m = Math.min(n, size), hw = hann(m), buf = new Float32Array(size);
  for (let i = 0; i < m; i++) buf[i] = fast[i] * hw[i];
  const mags = fftMag(buf);
  const hz = sr / STEP / size;
  let total = 0, peak = 0, peakBin = 0;
  for (let i = Math.ceil(4 / hz); i <= Math.min(mags.length - 1, Math.floor(110 / hz)); i++) {
    const pw = mags[i] * mags[i];
    total += pw;
    const f = i * hz;
    if (f >= 15 && f <= 40 && pw > peak) { peak = pw; peakBin = i; }
  }
  if (total <= 0 || !peakBin) return { rate: 0, share: 0, depth };
  let near = 0;
  const span = Math.max(1, Math.round(2.5 / hz));
  for (let i = peakBin - span; i <= peakBin + span; i++) if (i > 0 && i < mags.length) near += mags[i] * mags[i];
  return { rate: peakBin * hz, share: near / total, depth };
}

function emptyClipFeats() {
  return {
    maxRms: 0, numSeg: 0, totalVoiced: 0, avgSegDur: 0, longestSeg: 0, medianPitch: 0,
    contour: 1, contourWord: "steady", changeSt: 0, rangeSt: 0, pitchVar: 0, pitchedFrac: 0,
    avgFlat: 0, avgCentroid: 0, avgLowRatio: 0, avgClarity: 0, rough: 0,
    pulseRate: 0, pulseShare: 0, pulseDepth: 0, pulseDur: 0, segRate: 0, snrDb: 0,
    continuous: false, quality: "faint", loudWord: "soft",
  };
}

function analyzeClip(data, srIn) {
  const sr = CLIP_SR, N = 1024, HOP = 320, hopS = HOP / sr;
  const x = Float32Array.from(resampleTo(data, srIn, sr));
  let mean = 0, clipped = 0;
  for (let i = 0; i < x.length; i++) { mean += x[i]; if (Math.abs(x[i]) > 0.985) clipped++; }
  mean /= Math.max(1, x.length);
  for (let i = 0; i < x.length; i++) x[i] -= mean;
  const nF = Math.floor((x.length - N) / HOP) + 1;
  if (nF < 3) return emptyClipFeats();

  // 1. frame loudness, noise floor, and hysteresis gating
  const db = new Float32Array(nF);
  let maxRms = 0;
  for (let f = 0; f < nF; f++) {
    let sum = 0;
    const s = f * HOP;
    for (let i = 0; i < N; i++) sum += x[s + i] * x[s + i];
    const rms = Math.sqrt(sum / N);
    if (rms > maxRms) maxRms = rms;
    db[f] = 20 * Math.log10(rms + 1e-7);
  }
  const dbl = Array.from(db);
  const floorDb = quantile(dbl, 0.1), peakDb = quantile(dbl, 0.95), range = peakDb - floorDb;
  const ABS_GATE = -60;
  const continuous = range < 6 && peakDb > -52;
  const onT = continuous ? Math.max(ABS_GATE, peakDb - 28) : Math.max(floorDb + Math.max(0.45 * range, Math.min(8, 0.6 * range)), peakDb - 22, ABS_GATE);
  const offT = continuous ? onT : Math.max(floorDb + Math.max(0.25 * range, Math.min(5, 0.4 * range)), peakDb - 28, ABS_GATE);
  const voiced = new Uint8Array(nF);
  let on = false;
  for (let f = 0; f < nF; f++) {
    on = on ? db[f] > offT : db[f] > onT;
    voiced[f] = on ? 1 : 0;
  }

  // 2. segments: bridge gaps under 0.1 s, drop blips under 0.06 s
  const segs = [];
  let cur = null, gap = 0;
  for (let f = 0; f < nF; f++) {
    if (voiced[f]) { if (!cur) cur = { a: f, b: f }; else cur.b = f; gap = 0; }
    else if (cur) { gap++; if (gap * hopS > 0.1) { segs.push(cur); cur = null; gap = 0; } }
  }
  if (cur) segs.push(cur);
  const coarse = segs.filter((sg) => (sg.b - sg.a + 1) * hopS >= 0.06);
  // split each stretch into syllables at gaps of 45 ms or more (purr pulses are shorter, chatter gaps are longer)
  const FW = 256, FH = 80, dipT = Math.max(6, Math.min(12, 0.7 * range));
  const kept = [];
  for (const sg of coarse) {
    const A = sg.a * HOP, B = Math.min(x.length, sg.b * HOP + N);
    // a stretch that pulses at purr rate is one sound, however uneven its pulses are: never split it
    const pre = pulseAnalysis(x, A, B, sr);
    const pulsed = pre.share > 0.3 && pre.depth > 0.06;
    const lv = [];
    for (let s = A; s + FW <= B; s += FH) {
      let sum = 0;
      for (let i = 0; i < FW; i++) sum += x[s + i] * x[s + i];
      lv.push(10 * Math.log10(sum / FW + 1e-14));
    }
    if (lv.length < 4) continue;
    const thr = quantile(lv, 0.9) - dipT;
    if (pulsed) { // keep whole, just trim the quiet edges
      let i0 = 0, i1 = lv.length - 1;
      while (i0 < i1 && lv[i0] <= thr) i0++;
      while (i1 > i0 && lv[i1] <= thr) i1--;
      kept.push({ s0: A + i0 * FH, s1: Math.min(B, A + i1 * FH + FW) });
      continue;
    }
    let runA = -1, lastOn = -1;
    const close = (endIdx) => {
      const s0 = A + runA * FH, s1 = Math.min(B, A + endIdx * FH + FW);
      if ((s1 - s0) / sr >= 0.04) kept.push({ s0, s1 });
      runA = -1;
    };
    for (let i = 0; i < lv.length; i++) {
      if (lv[i] > thr) { if (runA < 0) runA = i; lastOn = i; }
      else if (runA >= 0 && (i - lastOn) * FH / sr >= 0.045) close(lastOn);
    }
    if (runA >= 0) close(lastOn);
  }
  for (const sg of kept) {
    sg.frames = [];
    const f0 = Math.max(0, Math.ceil((sg.s0 - N / 2) / HOP)), f1 = Math.min(nF - 1, Math.floor((sg.s1 - N / 2) / HOP));
    for (let f = f0; f <= f1; f++) sg.frames.push(f);
    if (!sg.frames.length) sg.frames.push(Math.max(0, Math.min(nF - 1, Math.round(((sg.s0 + sg.s1) / 2 - N / 2) / HOP))));
  }
  const out = emptyClipFeats();
  out.maxRms = maxRms;
  out.continuous = continuous;
  out.snrDb = Math.round(range);
  out.loudWord = maxRms < 0.035 ? "soft" : maxRms < 0.13 ? "medium" : "loud";
  out.quality = clipped / x.length > 0.005 ? "clipped" : peakDb < -42 ? "faint" : (!continuous && range < 12) ? "noisy" : "good";
  if (!kept.length || peakDb < -54) return out;

  // 3. background spectrum from the quiet frames, subtracted before measuring tone colour
  const win = hann(N), wbuf = new Float32Array(N), half = N >> 1;
  const noise = new Float32Array(half);
  const quietFrames = [];
  for (let f = 0; f < nF; f++) if (!voiced[f] && db[f] < offT - 2) quietFrames.push(f);
  const stepQ = Math.max(1, Math.floor(quietFrames.length / 30));
  let nq = 0;
  for (let q = 0; q < quietFrames.length; q += stepQ) {
    const s = quietFrames[q] * HOP;
    for (let i = 0; i < N; i++) wbuf[i] = x[s + i] * win[i];
    const m = fftMag(wbuf);
    for (let i = 0; i < half; i++) noise[i] += m[i];
    nq++;
  }
  if (nq) for (let i = 0; i < half; i++) noise[i] /= nq;

  const loBin = Math.max(1, Math.round((60 * N) / sr)), hiBin = Math.min(half - 1, Math.round((7500 * N) / sr));
  const lowCut = Math.round((320 * N) / sr);
  const flats = [], cents = [], lows = [], clar = [];
  let voicedFrames = 0, pitchedFrames = 0;
  const allPitch = [];
  for (const sg of kept) {
    sg.pitch = [];
    for (const f of sg.frames) {
      voicedFrames++;
      const s = f * HOP;
      for (let i = 0; i < N; i++) wbuf[i] = x[s + i] * win[i];
      const mags = fftMag(wbuf);
      let logSum = 0, sum = 0, cnt = 0, wsum = 0, lowSum = 0;
      for (let i = loBin; i <= hiBin; i++) {
        const m = Math.max(mags[i] - noise[i], mags[i] * 0.05) + 1e-9;
        logSum += Math.log(m); sum += m; cnt++;
        wsum += ((i * sr) / N) * m;
        if (i <= lowCut) lowSum += m;
      }
      flats.push(Math.exp(logSum / cnt) / (sum / cnt));
      cents.push(wsum / sum);
      lows.push(lowSum / sum);
      const p = yinPitch(x, s, N, sr, 70, 1600);
      clar.push(p.clarity);
      if (p.freq > 0 && p.clarity > 0.5) { sg.pitch.push({ f, hz: p.freq }); pitchedFrames++; }
    }
    // 4. repair octave slips against the segment's own median, then smooth
    if (sg.pitch.length >= 3) {
      const med = median(sg.pitch.map((q) => q.hz));
      for (const q of sg.pitch) {
        const r = q.hz / med;
        if (r > 1.8 && r < 2.2) q.hz /= 2;
        else if (r > 0.45 && r < 0.56) q.hz *= 2;
        else if (r > 2.7 && r < 3.3) q.hz /= 3;
      }
      const raw = sg.pitch.map((q) => q.hz);
      for (let i = 1; i < raw.length - 1; i++) sg.pitch[i].hz = median([raw[i - 1], raw[i], raw[i + 1]]);
    }
    for (const q of sg.pitch) allPitch.push(q.hz);
  }

  const durs = kept.map((sg) => (sg.s1 - sg.s0) / sr);
  const total = durs.reduce((a, b) => a + b, 0);
  let longest = kept[0];
  kept.forEach((sg) => { if (sg.s1 - sg.s0 > longest.s1 - longest.s0) longest = sg; });
  const spanS = (kept[kept.length - 1].s1 - kept[0].s0) / sr;

  out.numSeg = kept.length;
  out.totalVoiced = total;
  out.avgSegDur = total / kept.length;
  out.longestSeg = Math.max(...durs);
  out.segRate = kept.length > 1 ? kept.length / spanS : 0;
  out.avgFlat = avg(flats);
  out.avgCentroid = avg(cents);
  out.avgLowRatio = avg(lows);
  out.avgClarity = avg(clar);
  out.pitchedFrac = voicedFrames ? pitchedFrames / voicedFrames : 0;
  out.rough = clamp01(0.5 * up(out.avgFlat, 0.08, 0.38) + 0.5 * up(0.85 - out.avgClarity, 0, 0.5));

  if (allPitch.length >= 3 && out.pitchedFrac >= 0.2) {
    out.medianPitch = median(allPitch);
    const p10 = quantile(allPitch, 0.1), p25 = quantile(allPitch, 0.25), p75 = quantile(allPitch, 0.75), p90 = quantile(allPitch, 0.9);
    out.pitchVar = (p75 - p25) / out.medianPitch;
    out.rangeSt = semis(p90 / p10);
    // contour: last third against first third of the longest sound
    const track = (longest.pitch.length >= 4 ? longest.pitch.map((q) => q.hz) : allPitch);
    const k = Math.max(1, Math.floor(track.length / 3));
    const st = semis(median(track.slice(-k)) / median(track.slice(0, k)));
    out.changeSt = st;
    out.contour = Math.pow(2, st / 12);
    out.contourWord = st > 1.3 ? "rising" : st < -1.3 ? "falling" : "steady";
  }

  // pulse check over the whole stretch when the sound is nearly continuous (a purr broken by breaths), else the longest syllable
  // and over the whole stretch as well, because breaths and noise can chop a purr into pieces
  const paLong = pulseAnalysis(x, longest.s0, longest.s1, sr);
  const paSpan = kept.length > 1 && spanS >= 0.6 ? pulseAnalysis(x, kept[0].s0, kept[kept.length - 1].s1, sr) : null;
  const useSpan = paSpan && paSpan.depth > 0.06 && (paSpan.share > paLong.share || paSpan.share > 0.3);
  const pa = useSpan ? paSpan : paLong;
  out.pulseRate = pa.rate; out.pulseShare = pa.share; out.pulseDepth = pa.depth;
  out.pulseDur = useSpan ? spanS : out.longestSeg;
  return out;
}

// Scored classifier. Each sound type gets a 0-1 match from soft ranges on the measurements.
function classifySound(f) {
  if (!f.numSeg || f.totalVoiced < 0.05) return { key: "quiet", conf: 0.9, alt: null, scores: {} };
  const p = f.medianPitch, pitched = p > 0;
  const pulse = up(f.pulseShare, 0.18, 0.42) * up(f.pulseDepth, 0.06, 0.18) * band(f.pulseRate, 15, 18, 34, 40);
  const S = {};
  S.purr = Math.max(
    pulse * up(Math.max(f.totalVoiced, f.pulseDur || 0), 0.6, 1.2) * (0.55 + 0.45 * up(f.avgLowRatio, 0.2, 0.5)) * down(p, 300, 450),
    0.8 * up(f.avgLowRatio, 0.45, 0.65) * down(f.avgCentroid, 400, 650) * up(f.totalVoiced, 0.7, 1.2) * up(f.pulseDepth, 0.03, 0.1)
  );
  S.hiss = up(f.avgFlat, 0.18, 0.34) * down(f.pitchedFrac, 0.2, 0.55) * band(f.longestSeg, 0.1, 0.25, 2.5, 4) * (1 - 0.85 * pulse);
  S.chatter = up(f.numSeg, 2.5, 4.5) * down(f.avgSegDur, 0.2, 0.32) * up(f.segRate, 1.8, 3.5) * (1 - 0.9 * pulse);
  S.yowl = pitched
    ? up(f.longestSeg, 0.85, 1.25) * band(p, 190, 250, 950, 1150) * (0.45 + 0.55 * up(f.rangeSt, 0.8, 2.6)) * (f.loudWord === "soft" ? 0.6 : 1)
    : 0;
  S.trill = pitched
    ? down(f.longestSeg, 0.38, 0.62) * up(f.changeSt, 1.2, 2.4) * up(p, 340, 440) * (0.55 + 0.45 * pulse) * (1 - S.chatter)
    : 0;
  const meow = pitched
    ? band(p, 215, 270, 1350, 1600) * band(f.longestSeg, 0.1, 0.17, 1.35, 1.8) * up(f.pitchedFrac, 0.3, 0.6) *
      (1 - 0.6 * S.trill) * (1 - 0.6 * S.yowl) * (1 - 0.8 * S.chatter)
    : 0;
  S.grumble = pitched ? band(p, 60, 80, 215, 265) * up(f.pitchedFrac, 0.3, 0.6) * up(f.totalVoiced, 0.15, 0.4) : 0;
  let meowKey = "meow_chat";
  if (p >= 660) meowKey = "meow_hungry";
  else if (f.changeSt >= 1.3) meowKey = "meow_question";
  else if (f.changeSt <= -1.3 && p < 470) meowKey = "meow_grumpy";
  else if (f.longestSeg < 0.35) meowKey = "meow_hi";
  S[meowKey] = meow;
  S.mystery = 0.22;

  // a steady, tuneless, pulseless sound that fills the whole clip is background, not a cat
  if (f.continuous && S.purr < 0.2 && f.pitchedFrac < 0.2) return { key: "quiet", conf: 0.7, alt: null, scores: S, background: true };
  // so is an unwavering tone that fills the whole clip (an appliance whine or hum): cats never hold a pitch that still
  if (f.continuous && pitched && f.rangeSt < 0.4 && S.purr < 0.2) return { key: "quiet", conf: 0.7, alt: null, scores: S, background: true };

  const ranked = Object.keys(S).sort((a, b) => S[b] - S[a]);
  const k1 = ranked[0], k2 = ranked[1], s1 = S[k1], s2 = S[k2];
  let conf = 0.3 + 0.42 * s1 + 0.3 * (s1 - s2);
  if (f.quality === "noisy") conf *= 0.85;
  if (f.quality === "clipped" || f.quality === "faint") conf *= 0.9;
  if (k1 === "mystery") conf = 0.3;
  const alt = k2 !== "mystery" && k1 !== "mystery" && s2 > 0.3 && s2 > 0.5 * s1 ? { key: k2, score: s2 } : null;
  return { key: k1, conf: Math.max(0.2, Math.min(0.95, conf)), alt, scores: S };
}

