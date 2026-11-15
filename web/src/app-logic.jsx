// ------------------------------------------------------------------
// Main app
// ------------------------------------------------------------------

const EMPTY_BARS = new Array(14).fill(0.08);
const MAX_REC = 8;
const volGain = (v) => 0.75 * Math.pow(v, 1.5);

const DECO = [
  { l: "5%", t: "11%", d: "0s", s: 30, c: "#FBCFE0", r: -18 },
  { l: "86%", t: "7%", d: "1.2s", s: 24, c: "#DCD0F8", r: 16 },
  { l: "3%", t: "66%", d: "2.1s", s: 26, c: "#BFE9D6", r: 12 },
  { l: "88%", t: "58%", d: ".6s", s: 32, c: "#FBCFE0", r: -10 },
  { l: "47%", t: "95%", d: "1.7s", s: 24, c: "#C4E0F6", r: 8 },
];

function MeowchiApp() {
  const [tab, setTab] = useState("translate");
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [micMode, setMicMode] = useState("live"); // "live" | "picker"
  const [errorMsg, setErrorMsg] = useState("");
  const [playingId, setPlayingId] = useState(null);
  const [volume, setVolume] = useState(0.45);
  const [vizBars, setVizBars] = useState(EMPTY_BARS);
  const [ctx, setCtxState] = useState(null);

  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const buffersRef = useRef({});
  const playingRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const analyserRef = useRef(null);
  const rafRef = useRef(0);
  const recTimerRef = useRef(0);
  const recStartRef = useRef(0);
  const recordingRef = useRef(false);
  const micModeRef = useRef("live");
  const resultSeqRef = useRef(0);
  const fileInputRef = useRef(null);
  const captureInputRef = useRef(null);
  const ctxRef = useRef(null);
  const demoOrderRef = useRef([]);

  const ensureAudio = () => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const g = ctx.createGain();
      g.gain.value = volGain(volume);
      g.connect(ctx.destination);
      audioCtxRef.current = ctx;
      masterGainRef.current = g;
    }
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return audioCtxRef.current;
  };

  const getBuffer = (id) => {
    if (!buffersRef.current[id]) {
      const samples = SOUND_SYNTHS[id]();
      const buf = audioCtxRef.current.createBuffer(1, samples.length, SYNTH_SR);
      buf.getChannelData(0).set(samples);
      buffersRef.current[id] = buf;
    }
    return buffersRef.current[id];
  };

  const stopSound = () => {
    const p = playingRef.current;
    if (p) {
      try {
        const ctx = audioCtxRef.current;
        p.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        p.src.stop(ctx.currentTime + 0.25);
      } catch (e) {}
      playingRef.current = null;
    }
    setPlayingId(null);
  };

  const playSound = (id) => {
    const ctx = ensureAudio();
    if (playingRef.current && playingRef.current.id === id) { stopSound(); return; }
    stopSound();
    const src = ctx.createBufferSource();
    src.buffer = getBuffer(id);
    src.loop = true;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(SOUND_TRIMS[id], ctx.currentTime, 0.06);
    src.connect(g);
    g.connect(masterGainRef.current);
    src.start();
    playingRef.current = { src, gain: g, id };
    setPlayingId(id);
  };

  // ---------- live recording ----------

  const vizLoop = () => {
    const an = analyserRef.current;
    if (!an) return;
    const arr = new Uint8Array(an.frequencyBinCount);
    const step = () => {
      if (!recordingRef.current || !analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(arr);
      const bars = [];
      const per = Math.max(1, Math.floor(arr.length / 14));
      for (let b = 0; b < 14; b++) {
        let m = 0;
        for (let i = b * per; i < (b + 1) * per && i < arr.length; i++) m = Math.max(m, arr[i]);
        bars.push(m / 255);
      }
      setVizBars(bars);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const stopRecording = () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setRecording(false);
    clearInterval(recTimerRef.current);
    cancelAnimationFrame(rafRef.current);
    setVizBars(EMPTY_BARS);
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
    } catch (e) {}
  };

  const handleStop = () => {
    try { if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop()); } catch (e) {}
    streamRef.current = null;
    analyserRef.current = null;
    const mr = mediaRecorderRef.current;
    const blob = new Blob(chunksRef.current, { type: (mr && mr.mimeType) || "audio/webm" });
    chunksRef.current = [];
    if (!blob.size) { setErrorMsg("No sound came through. Try again a little closer?"); return; }
    analyzeBlob(blob);
  };

  // No live mic on this page: hand off to the device's own recorder / file picker.
  const usePicker = () => {
    micModeRef.current = "picker";
    setMicMode("picker");
    try { if (captureInputRef.current) captureInputRef.current.click(); } catch (e) {}
  };

  const startRecording = async () => {
    if (recordingRef.current) return;
    stopSound();
    setResult(null);
    setErrorMsg("");
    if (micModeRef.current === "picker") { usePicker(); return; }
    const ctx = ensureAudio();
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) || typeof window.MediaRecorder === "undefined") {
      usePicker();
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e1) {
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch (e2) { usePicker(); return; }
    }
    streamRef.current = stream;
    const srcNode = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.75;
    srcNode.connect(analyser);
    analyserRef.current = analyser;
    let mime = "";
    for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
      if (window.MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) { mime = m; break; }
    }
    let mr;
    try { mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream); }
    catch (e) {
      try { mr = new MediaRecorder(stream); }
      catch (e2) {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        usePicker();
        return;
      }
    }
    chunksRef.current = [];
    mr.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunksRef.current.push(ev.data); };
    mr.onstop = handleStop;
    mediaRecorderRef.current = mr;
    mr.start();
    recordingRef.current = true;
    setRecording(true);
    setRecSeconds(0);
    recStartRef.current = performance.now();
    recTimerRef.current = setInterval(() => {
      const el = (performance.now() - recStartRef.current) / 1000;
      setRecSeconds(el);
      if (el >= MAX_REC) stopRecording();
    }, 100);
    vizLoop();
  };

  // ---------- analysis ----------

  const analyzeBlob = async (blob) => {
    stopSound();
    setErrorMsg("");
    setAnalyzing(true);
    setResult(null);
    try {
      const ab = await blob.arrayBuffer();
      const ctx = ensureAudio();
      const audioBuf = await ctx.decodeAudioData(ab);
      setTimeout(() => {
        try { runAnalysis(audioBuf); }
        catch (e) { setErrorMsg("The analysis got tangled. Try that one again?"); }
        finally { setAnalyzing(false); }
      }, 40);
    } catch (e) {
      setAnalyzing(false);
      setErrorMsg("That audio wouldn't open. Try a different clip (m4a, mp3, wav or webm).");
    }
  };

  const runAnalysis = (audioBuf) => {
    const cap = Math.min(audioBuf.length, Math.floor(audioBuf.sampleRate * 8));
    let data;
    if (audioBuf.numberOfChannels > 1) {
      const a = audioBuf.getChannelData(0), b = audioBuf.getChannelData(1);
      data = new Float32Array(cap);
      for (let i = 0; i < cap; i++) data[i] = (a[i] + b[i]) * 0.5;
    } else {
      const a = audioBuf.getChannelData(0);
      data = a.length > cap ? a.slice(0, cap) : a;
    }
    const feats = analyzeClip(data, audioBuf.sampleRate);
    presentResult(classifySound(feats), feats, false);
  };

  const demoCtxRef = useRef(false); // true while the setting chip was chosen by a demo clip, not by the person
  const setCtx = (id) => { ctxRef.current = id; demoCtxRef.current = false; setCtxState(id); };

  const presentResult = (base, feats, demo) => {
    const id = ++resultSeqRef.current;
    if (!demo && demoCtxRef.current) setCtx(null); // a demo's setting must not colour a real recording
    const res = {
      id, key: base.key, conf: Math.min(0.95, base.conf), feats,
      alt: base.alt || null, background: !!base.background,
      demo: demo || null, ai: null, aiState: base.key === "quiet" ? "off" : "loading",
    };
    setResult(res);
    if (base.key !== "quiet") {
      setHistory((h) => [{ id, label: TYPE_META[base.key].label }, ...h].slice(0, 4));
      requestAi(res, demo ? demo.ctx : ctxRef.current);
    }
  };

  const requestAi = async (res, ctxId) => {
    const needs = inferNeeds(res.key, res.feats, ctxId);
    if (!needs.length) return;
    const payload = {
      sound: TYPE_META[res.key].label,
      pitchHz: Math.round(res.feats.medianPitch || 0),
      longestSoundSec: +res.feats.longestSeg.toFixed(2),
      pitchContour: res.feats.contourWord,
      loudness: res.feats.loudWord,
      repeats: res.feats.numSeg,
      setting: ctxId ? CONTEXTS[ctxId].label : "unknown",
      likelyNeeds: needs.map((n) => NEEDS[n.id].label + " (" + n.why + ")"),
    };
    try {
      const j = await fetchAiTranslation(payload);
      setResult((r) => (r && r.id === res.id ? { ...r, ai: { text: String(j.translation), need: needs[0].id }, aiState: "done" } : r));
    } catch (e) {
      setResult((r) => (r && r.id === res.id ? { ...r, aiState: "fallback" } : r));
    }
  };

  const runDemo = () => {
    if (recordingRef.current) return;
    stopSound();
    setErrorMsg("");
    setResult(null);
    setAnalyzing(true);
    if (!demoOrderRef.current.length) {
      const order = DEMOS.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = order[i]; order[i] = order[j]; order[j] = t;
      }
      demoOrderRef.current = order;
    }
    const d = DEMOS[demoOrderRef.current.pop()];
    setTimeout(() => {
      setAnalyzing(false);
      setCtx(d.ctx || null);
      demoCtxRef.current = true;
      presentResult({ key: d.key, conf: 0.74 + Math.random() * 0.18 }, demoClipFeats(d), d);
    }, 600);
  };

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (f) analyzeBlob(f);
  };

  // ---------- effects ----------

  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setTargetAtTime(volGain(volume), audioCtxRef.current.currentTime, 0.05);
    }
  }, [volume]);

  useEffect(() => {
    if (tab !== "call") stopSound();
    if (tab !== "translate") stopRecording();
  }, [tab]);

  useEffect(() => {
    return () => {
      try { clearInterval(recTimerRef.current); cancelAnimationFrame(rafRef.current); } catch (e) {}
      try { if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop()); } catch (e) {}
      try { if (playingRef.current) playingRef.current.src.stop(); } catch (e) {}
      try { if (audioCtxRef.current) audioCtxRef.current.close(); } catch (e) {}
    };
  }, []);

