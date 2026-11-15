// ------------------------------------------------------------------
// Sound synthesis (Call Kitty tab) — all baked into loopable buffers
// ------------------------------------------------------------------

const SYNTH_SR = 24000;

function normalizeBuf(s, peak) {
  let m = 0;
  for (let i = 0; i < s.length; i++) { const a = Math.abs(s[i]); if (a > m) m = a; }
  if (m > 1e-6) { const g = peak / m; for (let i = 0; i < s.length; i++) s[i] *= g; }
  return s;
}
function crossfadeLoop(s, f) {
  const n = s.length;
  for (let i = 0; i < f; i++) { const t = i / f; s[n - f + i] = s[n - f + i] * (1 - t) + s[i] * t; }
  return s;
}

function synthPurr() {
  const n = SYNTH_SR * 4, s = new Float32Array(n);
  let x = 0;
  for (let i = 0; i < n; i++) { x = x * 0.998 + (Math.random() * 2 - 1) * 0.02; s[i] = x; }
  const out = biquadFilter(s, SYNTH_SR, "lowpass", 350, 0.707);
  for (let i = 0; i < n; i++) {
    const t = i / SYNTH_SR;
    const v = out[i] * 3.0 + 0.22 * Math.sin(2 * Math.PI * 50 * t);
    const trem = 0.55 + 0.45 * Math.sin(2 * Math.PI * 26 * t);       // 26 Hz purr flutter
    const breath = 0.72 + 0.28 * Math.sin(2 * Math.PI * 0.25 * t);   // slow breathing
    out[i] = v * trem * breath;
  }
  return crossfadeLoop(normalizeBuf(out, 0.85), 2400);
}

function synthPspsps() {
  const n = Math.floor(SYNTH_SR * 1.6), s = new Float32Array(n);
  for (let i = 0; i < n; i++) s[i] = Math.random() * 2 - 1;
  let f = biquadFilter(s, SYNTH_SR, "highpass", 2600, 0.8);
  f = biquadFilter(f, SYNTH_SR, "bandpass", 5200, 1.1);
  const out = new Float32Array(n);
  for (const b of [0.06, 0.28, 0.5]) {
    const st = Math.floor(b * SYNTH_SR), bl = Math.floor(0.13 * SYNTH_SR);
    for (let i = 0; i < bl && st + i < n; i++) {
      const u = i / bl;
      const env = u < 0.12 ? u / 0.12 : u > 0.75 ? (1 - u) / 0.25 : 1;
      out[st + i] = f[st + i] * env;
    }
  }
  return normalizeBuf(out, 0.7);
}

function addChirp(buf, t0, dur, f0, f1, amp, shape) {
  const s0 = Math.floor(t0 * SYNTH_SR), sn = Math.floor(dur * SYNTH_SR);
  let phase = Math.random() * 6.28;
  for (let i = 0; i < sn; i++) {
    const idx = s0 + i;
    if (idx >= buf.length) break;
    const u = i / sn;
    let fr;
    if (shape === "fall") fr = f0 * Math.pow(f1 / f0, u);
    else fr = f0 + (f1 - f0) * Math.sin(Math.PI * 0.5 * u);
    const vib = 1 + 0.05 * Math.sin(2 * Math.PI * 45 * (i / SYNTH_SR));
    phase += (2 * Math.PI * fr * vib) / SYNTH_SR;
    const env = Math.pow(Math.sin(Math.PI * u), 0.6);
    buf[idx] += amp * env * Math.sin(phase);
  }
}

function synthBirds() {
  const n = Math.floor(SYNTH_SR * 3.2), s = new Float32Array(n);
  for (const cluster of [0.12, 1.25, 2.25]) {
    const count = 2 + Math.floor(Math.random() * 3);
    for (let c = 0; c < count; c++) {
      const t0 = cluster + c * (0.11 + Math.random() * 0.05);
      const f0 = 2500 + Math.random() * 600;
      addChirp(s, t0, 0.07 + Math.random() * 0.05, f0, f0 + 500 + Math.random() * 400, 0.8, "rise");
    }
  }
  return normalizeBuf(s, 0.75);
}

function synthMouse() {
  const n = Math.floor(SYNTH_SR * 2.6), s = new Float32Array(n);
  for (const t0 of [0.25, 0.36, 1.22, 1.33, 1.43, 2.1]) {
    addChirp(s, t0 + (Math.random() - 0.5) * 0.03, 0.05 + Math.random() * 0.04, 6800, 4300, 0.75, "fall");
  }
  return normalizeBuf(s, 0.7);
}

function synthMew() {
  const n = Math.floor(SYNTH_SR * 2.4), s = new Float32Array(n);
  const start = 0.15, dur = 0.55;
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SYNTH_SR;
    if (t < start || t > start + dur) { s[i] = 0; continue; }
    const u = (t - start) / dur;
    let fr = 680 + 260 * Math.sin(Math.PI * Math.pow(u, 0.85));
    fr *= 1 + 0.02 * Math.sin(2 * Math.PI * 7 * t);
    phase += (2 * Math.PI * fr) / SYNTH_SR;
    let v = 0;
    for (let k = 1; k <= 8; k++) v += Math.sin(k * phase) / k;
    s[i] = v * Math.pow(Math.sin(Math.PI * u), 0.7);
  }
  const bp1 = biquadFilter(s, SYNTH_SR, "bandpass", 1100, 4);
  const bp2 = biquadFilter(s, SYNTH_SR, "bandpass", 3000, 5);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = 0.3 * s[i] + 0.55 * bp1[i] + 0.4 * bp2[i];
  return normalizeBuf(out, 0.8);
}

function synthCrinkle() {
  const dur = 2.2, n = Math.floor(SYNTH_SR * dur), s = new Float32Array(n);
  let t = 0.02;
  while (t < dur - 0.03) {
    const density = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 1.2 * t));
    if (Math.random() < density) {
      const bd = 0.004 + Math.random() * 0.014;
      const bn = Math.floor(bd * SYNTH_SR), st = Math.floor(t * SYNTH_SR);
      const amp = 0.3 + 0.7 * Math.random();
      for (let i = 0; i < bn && st + i < n; i++) {
        const u = i / bn;
        s[st + i] += amp * (Math.random() * 2 - 1) * Math.sin(Math.PI * u);
      }
    }
    t += 0.006 + Math.random() * 0.02;
  }
  const hp = biquadFilter(s, SYNTH_SR, "highpass", 2200, 0.8);
  const bp = biquadFilter(s, SYNTH_SR, "bandpass", 6500, 1.2);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = 0.75 * hp[i] + 0.6 * bp[i];
  return crossfadeLoop(normalizeBuf(out, 0.75), 600);
}

const SOUND_SYNTHS = {
  pspsps: synthPspsps,
  purr: synthPurr,
  birds: synthBirds,
  mouse: synthMouse,
  mew: synthMew,
  crinkle: synthCrinkle,
};
const SOUND_TRIMS = { pspsps: 0.5, purr: 0.95, birds: 0.4, mouse: 0.35, mew: 0.55, crinkle: 0.4 };

// ------------------------------------------------------------------
// Cat vocabulary
// ------------------------------------------------------------------

const SOUNDS = [
  { id: "pspsps", emoji: "👋", name: "Pspsps!", tag: "come here!", line: "psst psst psst~ over here, kitty!", faceMood: "excited", pal: 0 },
  { id: "purr", emoji: "💤", name: "Purr-purr", tag: "cuddle & calm", line: "rrrrr... nap time vibes~", faceMood: "sleepy", pal: 1 },
  { id: "birds", emoji: "🐦", name: "Birdsong", tag: "perk up!", line: "cheep cheep! who's there?!", faceMood: "excited", pal: 2 },
  { id: "mouse", emoji: "🐭", name: "Mouse Squeaks", tag: "pounce mode", line: "squeak squeak... hunt time!", faceMood: "excited", pal: 3 },
  { id: "mew", emoji: "🐱", name: "Kitten Mew", tag: "curiosity call", line: "mew? mew!", faceMood: "surprised", pal: 0 },
  { id: "crinkle", emoji: "🍬", name: "Treat Crinkle", tag: "snack o'clock", line: "crinkle crinkle~ treats?!", faceMood: "excited", pal: 2 },
];
const TAG_PALS = [
  { bg: "#FFE4F0", fg: "#E45E96", bd: "#FFC3DC" },
  { bg: "#F0EAFF", fg: "#8E6FD8", bd: "#DCCFFA" },
  { bg: "#E4F8EE", fg: "#3FA97C", bd: "#BFE8D6" },
  { bg: "#FFF0E2", fg: "#E08A4C", bd: "#FFD9B8" },
];

