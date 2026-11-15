// Held-out check: randomised clips the tuning never saw. Run once and report as is.
const fs = require("fs"), path = require("path");
const head = fs.readFileSync(path.join(__dirname, "bench.js"), "utf8");
new Function("require", "__dirname", head.slice(0, head.indexOf("// label -> generator")) + head.slice(head.indexOf("function addNoise"), head.indexOf("const CONDS")) +
  ";globalThis.B={tone,norm,place,arch,glide,vib,hissClip,addNoise,setSeed:(v)=>{seed=v},rnd,gauss,M,SR};")(require, __dirname);
const { tone, norm, place, arch, glide, vib, hissClip, addNoise, setSeed, rnd, gauss, M, SR } = globalThis.B;
const U = (a, b) => a + (b - a) * rnd();
const st = (f, s) => f * Math.pow(2, s / 12);
const GEN = {
  meow_hungry: () => { const f = U(720, 950), n = Math.floor(U(1, 4)); return place(Array.from({ length: n }, () => norm(tone(U(0.45, 0.9), arch(f, st(f, U(1, 3)), U(0, 40)), { harm: Math.floor(U(4, 9)) }), U(0.3, 0.7))), U(0.3, 0.6)); },
  meow_question: () => { const f = U(420, 560); return place([norm(tone(U(0.45, 0.9), glide(f, st(f, U(4, 7))), { harm: Math.floor(U(4, 9)) }), U(0.25, 0.6))], 0); },
  meow_grumpy: () => { const f = U(385, 450); return place([norm(tone(U(0.6, 1.1), glide(f, st(f, -U(3, 6))), { noise: U(0, 0.2) }), U(0.25, 0.5))], 0); },
  meow_hi: () => { const f = U(480, 630), n = Math.floor(U(1, 3)); return place(Array.from({ length: n }, () => norm(tone(U(0.18, 0.29), arch(f, st(f, U(0, 1)))), U(0.25, 0.6))), U(0.4, 0.7)); },
  meow_chat: () => { const f = U(430, 600); return place([norm(tone(U(0.45, 0.9), arch(f, st(f, U(0.3, 1.2))), { harm: Math.floor(U(4, 9)) }), U(0.25, 0.6))], 0); },
  yowl: () => { const f = U(350, 600); return place([norm(tone(U(1.5, 2.5), vib(f, U(0.08, 0.15), U(1.8, 3.2)), { harm: 8, noise: U(0, 0.12) }), U(0.45, 0.8))], 0); },
  trill: () => { const f = U(400, 520); return place([norm(tone(U(0.25, 0.4), glide(f, st(f, U(5, 9))), { am: U(0.35, 0.6), amHz: U(20, 30) }), U(0.25, 0.5))], 0); },
  chatter: () => { const f = U(450, 650), n = Math.floor(U(5, 10)); return place(Array.from({ length: n }, () => norm(tone(U(0.05, 0.09), arch(f, f * 1.08), { harm: 4, noise: U(0, 0.3) }), U(0.25, 0.45))), U(0.07, 0.12)); },
  hiss: () => place([norm(hissClip(U(0.5, 1.4)), U(0.3, 0.6))], 0),
  grumble: () => { const f = U(130, 200); return place([norm(tone(U(0.5, 1.0), glide(f, f * U(0.82, 0.98)), { noise: U(0.05, 0.25), harm: 10 }), U(0.2, 0.4))], 0); },
  purr: () => {
    if (rnd() < 0.4) return place([norm(M.synthPurr().slice(0, Math.floor(24000 * U(2, 4))), U(0.1, 0.3))], 0, 0.3, 0.3);
    const rate = U(20, 30), n = Math.floor(SR * U(2, 4)), s = new Float32Array(n);
    for (let i = 0; i < n; i++) { const ph = (rate * i / SR) % 1; s[i] = ph < 0.25 ? Math.sin(Math.PI * ph / 0.25) * (0.5 + rnd()) : 0.03 * gauss(); }
    return place([norm(M.biquadFilter(s, SR, "lowpass", U(300, 500), 0.8), U(0.1, 0.3))], 0, 0.3, 0.3);
  },
};
const fam = (k) => (k.startsWith("meow_") ? "meow" : k);
const labels = Object.keys(GEN);
const PER = 30;
let n = 0, oF = 0, nF = 0, oE = 0, nE = 0;
const byClass = {}, buckets = [[0, 0.5], [0.5, 0.7], [0.7, 0.85], [0.85, 1.01]].map(([a, b]) => ({ a, b, n: 0, ok: 0 }));
const bySnr = { "6-12 dB": [0, 0, 0], "12-20 dB": [0, 0, 0], "20-30 dB": [0, 0, 0] };
labels.forEach((label, li) => {
  byClass[label] = { o: 0, n: 0 };
  for (let k = 0; k < PER; k++) {
    setSeed(900000 + li * 7919 + k * 104729);
    const snr = U(6, 30), kind = rnd() < 0.5 ? "white" : "room", gain = Math.pow(10, -U(0, 14) / 20);
    const sig = addNoise(GEN[label]().map((v) => v * gain), snr, kind);
    const o = M.classify(M.extractFeatures(M.resampleTo(sig, SR, M.ANALYSIS_SR), M.ANALYSIS_SR)).key;
    const c = M.classifySound(M.analyzeClip(sig, SR));
    n++; oF += fam(o) === fam(label); nF += fam(c.key) === fam(label); oE += o === label; nE += c.key === label;
    byClass[label].o += o === label; byClass[label].n += c.key === label;
    const bk = buckets.find((q) => c.conf >= q.a && c.conf < q.b); bk.n++; bk.ok += c.key === label;
    const sb = bySnr[snr < 12 ? "6-12 dB" : snr < 20 ? "12-20 dB" : "20-30 dB"]; sb[0]++; sb[1] += o === label; sb[2] += c.key === label;
  }
});
console.log(`held-out clips: ${n}`);
console.log(`sound family correct  old ${oF} (${(100 * oF / n).toFixed(0)}%)  new ${nF} (${(100 * nF / n).toFixed(0)}%)`);
console.log(`exact type correct    old ${oE} (${(100 * oE / n).toFixed(0)}%)  new ${nE} (${(100 * nE / n).toFixed(0)}%)`);
console.log("per type (exact, of " + PER + "):"); for (const l of labels) console.log("  " + l.padEnd(14), "old", String(byClass[l].o).padStart(2), " new", String(byClass[l].n).padStart(2));
console.log("by noise level (exact):"); for (const k in bySnr) console.log("  " + k.padEnd(9), "n=" + bySnr[k][0], " old", bySnr[k][1], " new", bySnr[k][2]);
console.log("new confidence vs accuracy:"); for (const b of buckets) console.log(`  conf ${b.a.toFixed(2)}-${Math.min(1, b.b).toFixed(2)}  n=${String(b.n).padStart(3)}  correct ${b.n ? (100 * b.ok / b.n).toFixed(0) + "%" : "-"}`);
