// Benchmark: old analysis vs v2 on synthetic cat-like clips under clean and noisy conditions.
const fs = require("fs"), path = require("path");
const read = (f) => fs.readFileSync(path.join(__dirname, f), "utf8");
eval(read("../src/dsp.js") + read("../src/sounds.js") + read("baseline-v1.js") + read("../src/analysis.js") +
  "\n;globalThis.M={extractFeatures,classify,analyzeClip,classifySound,resampleTo,biquadFilter,synthPurr,ANALYSIS_SR};");
const M = globalThis.M;
const SR = 24000;

// deterministic noise
let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += rnd(); return (u - 3) / 0.7071; };

function tone(dur, f0fn, { harm = 6, am = 0, amHz = 25, noise = 0, tilt = 1 } = {}) {
  const n = Math.floor(dur * SR), s = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n, t = i / SR;
    ph += (2 * Math.PI * f0fn(u, t)) / SR;
    let v = 0;
    for (let k = 1; k <= harm; k++) v += Math.sin(k * ph) / Math.pow(k, tilt);
    const env = Math.pow(Math.sin(Math.PI * u), 0.6);
    const mod = 1 - am * (0.5 + 0.5 * Math.sin(2 * Math.PI * amHz * t));
    s[i] = (v + noise * gauss()) * env * mod;
  }
  return s;
}
function norm(s, peak) { let m = 0; for (const v of s) m = Math.max(m, Math.abs(v)); for (let i = 0; i < s.length; i++) s[i] *= peak / (m || 1); return s; }
function place(parts, gapS, lead = 0.5, tail = 0.5) {
  const gap = Math.floor(gapS * SR);
  let len = Math.floor((lead + tail) * SR);
  parts.forEach((p, i) => { len += p.length + (i ? gap : 0); });
  const out = new Float32Array(len);
  let pos = Math.floor(lead * SR);
  parts.forEach((p, i) => { if (i) pos += gap; out.set(p, pos); pos += p.length; });
  return out;
}
const arch = (lo, hi, endShift = 0) => (u) => lo + (hi - lo) * Math.sin(Math.PI * Math.pow(u, 0.9)) + endShift * u;
const glide = (a, b) => (u) => a * Math.pow(b / a, u);
const vib = (f, depth, hz) => (u, t) => f * (1 + depth * Math.sin(2 * Math.PI * hz * t) + 0.5 * depth * Math.sin(2 * Math.PI * hz * 0.37 * t));

function hissClip(dur) {
  const n = Math.floor(dur * SR), s = new Float32Array(n);
  for (let i = 0; i < n; i++) s[i] = gauss();
  let f = M.biquadFilter(s, SR, "highpass", 1800, 0.7);
  f = M.biquadFilter(f, SR, "lowpass", 7000, 0.7);
  for (let i = 0; i < n; i++) { const u = i / n; f[i] *= Math.min(1, u / 0.08) * Math.pow(1 - u, 0.5); }
  return f;
}

// label -> generator of the raw event(s); "family" groups meow subtypes
const CASES = [
  ["meow_hungry", () => place([norm(tone(0.65, arch(700, 860, 60)), 0.6)], 0)],
  ["meow_hungry", () => place([0, 1, 2].map(() => norm(tone(0.5, arch(720, 900, 40)), 0.6)), 0.35)],
  ["meow_question", () => place([norm(tone(0.55, glide(470, 640)), 0.4)], 0)],
  ["meow_question", () => place([norm(tone(0.7, glide(420, 600), { harm: 8 }), 0.4)], 0)],
  ["meow_grumpy", () => place([norm(tone(0.8, glide(450, 330), { noise: 0.15 }), 0.35)], 0)],
  ["meow_grumpy", () => place([norm(tone(0.9, glide(420, 300)), 0.35)], 0)],
  ["meow_hi", () => place([norm(tone(0.24, arch(560, 620)), 0.4)], 0)],
  ["meow_hi", () => place([0, 1].map(() => norm(tone(0.26, arch(580, 640)), 0.4)), 0.5)],
  ["meow_chat", () => place([norm(tone(0.6, arch(480, 540)), 0.4)], 0)],
  ["meow_chat", () => place([norm(tone(0.75, arch(500, 560), { harm: 9 }), 0.4)], 0)],
  ["purr", () => place([norm(M.resampleTo(M.synthPurr(), 24000, SR), 0.25)], 0, 0.2, 0.2)],
  ["purr", () => { const p = M.synthPurr().slice(0, 24000 * 2.5); return place([norm(p, 0.12)], 0, 0.4, 0.4); }],
  ["purr", () => { // pulse-train purr: 27 Hz glottal pulses exciting a low resonance
      const n = SR * 3, s = new Float32Array(n);
      for (let i = 0; i < n; i++) { const ph = (27 * i / SR) % 1; s[i] = ph < 0.25 ? Math.sin(Math.PI * ph / 0.25) * (0.5 + rnd()) : 0.03 * gauss(); }
      return place([norm(M.biquadFilter(s, SR, "lowpass", 400, 0.8), 0.2)], 0, 0.3, 0.3); }],
  ["hiss", () => place([norm(hissClip(0.8), 0.5)], 0)],
  ["hiss", () => place([norm(hissClip(1.3), 0.4)], 0)],
  ["chatter", () => place([0, 1, 2, 3, 4, 5].map(() => norm(tone(0.08, arch(480, 520), { harm: 4 }), 0.35)), 0.1)],
  ["chatter", () => place([0, 1, 2, 3, 4, 5, 6, 7].map(() => norm(tone(0.06, arch(520, 600), { noise: 0.3 }), 0.3)), 0.08)],
  ["yowl", () => place([norm(tone(2.0, vib(450, 0.12, 2.3), { harm: 8 }), 0.6)], 0)],
  ["yowl", () => place([norm(tone(1.7, (u, t) => 520 * (1 - 0.25 * u) * (1 + 0.06 * Math.sin(2 * Math.PI * 3 * t)), { noise: 0.1 }), 0.6)], 0)],
  ["trill", () => place([norm(tone(0.4, glide(450, 700), { am: 0.5, amHz: 26 }), 0.4)], 0)],
  ["trill", () => place([norm(tone(0.32, glide(500, 760), { am: 0.4, amHz: 22 }), 0.4)], 0)],
  ["grumble", () => place([norm(tone(0.8, glide(190, 160), { noise: 0.2, harm: 10 }), 0.3)], 0)],
  ["quiet", () => new Float32Array(SR * 2)],
  ["quiet", () => { const s = new Float32Array(SR * 3); for (let i = 0; i < s.length; i++) s[i] = 0.02 * gauss(); return s; }], // steady room noise only
];

function addNoise(sig, snrDb, kind) {
  let peakPow = 0; // SNR measured against the loud part of the signal
  const blk = 2048; for (let s = 0; s + blk <= sig.length; s += blk) { let e = 0; for (let i = 0; i < blk; i++) e += sig[s + i] * sig[s + i]; peakPow = Math.max(peakPow, e / blk); }
  const amp = Math.sqrt(peakPow / Math.pow(10, snrDb / 10));
  const out = Float32Array.from(sig);
  let lp = 0;
  for (let i = 0; i < out.length; i++) {
    const w = gauss();
    if (kind === "white") out[i] += amp * w;
    else if (kind === "room") { lp = 0.97 * lp + 0.03 * w; out[i] += amp * (lp * 6 + 0.25 * w) + amp * 0.7 * Math.sin(2 * Math.PI * 60 * i / SR); }
  }
  return out;
}
const CONDS = [
  ["clean", (s) => addNoise(s, 60, "white")],
  ["white 20 dB", (s) => addNoise(s, 20, "white")],
  ["white 10 dB", (s) => addNoise(s, 10, "white")],
  ["room+hum 15 dB", (s) => addNoise(s, 15, "room")],
  ["room+hum 8 dB", (s) => addNoise(s, 8, "room")],
  ["quiet -18 dB", (s) => addNoise(s.map((v) => v * 0.125), 30, "white")],
];

const fam = (k) => (k.startsWith("meow_") ? "meow" : k);
const verbose = process.argv.includes("-v");
const rows = [];
for (const [cname, cfn] of CONDS) {
  const r = { cond: cname, n: 0, oldFam: 0, newFam: 0, oldExact: 0, newExact: 0 };
  CASES.forEach(([label, gen], ci) => {
    if (label === "quiet" && cname !== "clean") return;
    seed = 1000 + ci * 17 + cname.length;
    const sig = cfn(gen());
    const xo = M.resampleTo(sig, SR, M.ANALYSIS_SR);
    const o = M.classify(M.extractFeatures(xo, M.ANALYSIS_SR)).key;
    const f2 = M.analyzeClip(sig, SR), c2 = M.classifySound(f2);
    r.n++;
    r.oldFam += fam(o) === fam(label); r.newFam += fam(c2.key) === fam(label);
    r.oldExact += o === label; r.newExact += c2.key === label;
    if (verbose && (c2.key !== label || o !== label))
      console.log(`  [${cname}] ${label.padEnd(14)} old=${o.padEnd(14)} new=${c2.key.padEnd(14)} conf=${c2.conf.toFixed(2)} p=${Math.round(f2.medianPitch)} st=${f2.changeSt.toFixed(1)} seg=${f2.numSeg} long=${f2.longestSeg.toFixed(2)} flat=${f2.avgFlat.toFixed(2)} pf=${f2.pitchedFrac.toFixed(2)} pulse=${f2.pulseShare.toFixed(2)}/${f2.pulseDepth.toFixed(2)}@${f2.pulseRate.toFixed(0)} low=${f2.avgLowRatio.toFixed(2)} cont=${f2.continuous}`);
  });
  rows.push(r);
}
console.log("condition          clips  old type  new type  old exact  new exact");
let T = { n: 0, a: 0, b: 0, c: 0, d: 0 };
for (const r of rows) {
  console.log(r.cond.padEnd(18), String(r.n).padStart(5), String(r.oldFam).padStart(9), String(r.newFam).padStart(9), String(r.oldExact).padStart(10), String(r.newExact).padStart(10));
  T.n += r.n; T.a += r.oldFam; T.b += r.newFam; T.c += r.oldExact; T.d += r.newExact;
}
console.log("TOTAL".padEnd(18), String(T.n).padStart(5), String(T.a).padStart(9), String(T.b).padStart(9), String(T.c).padStart(10), String(T.d).padStart(10));
const t0 = Date.now(); const big = addNoise(place([norm(tone(2.0, vib(450, 0.12, 2.3)), 0.6), norm(tone(2.0, vib(450, 0.12, 2.3)), 0.6)], 1, 1.5, 1.5), 20, "white");
M.classifySound(M.analyzeClip(big, SR)); console.log("8 s clip analysis time:", Date.now() - t0, "ms");
