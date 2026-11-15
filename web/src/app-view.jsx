  // ---------- derived UI ----------

  const dots = (
    <span aria-hidden="true">
      <span className="mc-dot">.</span>
      <span className="mc-dot" style={{ animationDelay: ".15s" }}>.</span>
      <span className="mc-dot" style={{ animationDelay: ".3s" }}>.</span>
    </span>
  );

  const readable = result && result.key !== "quiet";
  const needs = readable ? inferNeeds(result.key, result.feats, ctx) : [];
  const top = needs[0];
  let line = null;
  if (result) {
    if (!readable) line = result.background ? BACKGROUND_LINE : QUIET_LINE;
    else if (result.ai && top && result.ai.need === top.id) line = result.ai.text;
    else line = composeLine(needs, result.key, result.feats, ctx, result.id);
  }

  let catMood = "idle";
  let bubble = null;
  let bubbleKey = "idle";
  if (tab === "translate") {
    if (recording) { catMood = "listen"; bubble = <span>Listening. Hold the phone near your cat.</span>; bubbleKey = "rec"; }
    else if (analyzing) { catMood = "think"; bubble = <span>Working out what that meant{dots}</span>; bubbleKey = "an"; }
    else if (result) { catMood = readable ? NEEDS[top.id].face : "surprised"; bubble = <span>{line}</span>; bubbleKey = result.id + "-" + (top ? top.id : "q") + "-" + result.aiState; }
    else if (errorMsg) { catMood = "surprised"; bubble = <span>{errorMsg}</span>; bubbleKey = "err"; }
    else if (micMode === "picker") { catMood = "surprised"; bubble = <span>The live mic isn't allowed on this page, so the button opens your recorder instead.</span>; bubbleKey = "mic"; }
    else { bubble = <span>Tap the cat to record, and I'll tell you what your cat may want.</span>; }
  } else {
    const cs = SOUNDS.find((s) => s.id === playingId);
    catMood = cs ? cs.faceMood : "idle";
    bubble = <span>{cs ? SOUND_COPY[cs.id].line : "Pick a sound to play for your cat."}</span>;
    bubbleKey = playingId || "call-idle";
  }

  const chips = [];
  if (readable) {
    const f = result.feats;
    if (f.medianPitch > 0) chips.push("Pitch " + Math.round(f.medianPitch) + " Hz");
    chips.push(f.longestSeg.toFixed(1) + " s long");
    if (f.numSeg > 1) chips.push("Repeated " + f.numSeg + " times");
    if (f.medianPitch > 0) chips.push(f.contourWord === "rising" ? "Rising pitch" : f.contourWord === "falling" ? "Falling pitch" : "Steady pitch");
    chips.push(f.loudWord === "loud" ? "Loud" : f.loudWord === "soft" ? "Soft" : "Medium volume");
    if (f.pulseRate && result.key === "purr") chips.push("Pulse " + Math.round(f.pulseRate) + " per second");
    if (f.medianPitch > 0 && f.rough !== undefined) chips.push(f.rough > 0.5 ? "Rough voice" : "Clear voice");
  }

  const hint = recording
    ? "Tap again to stop"
    : analyzing
    ? "Listening back..."
    : micMode === "picker"
    ? "Tap the cat to record with your device, or pick a clip"
    : "Tap the cat to record live (up to " + MAX_REC + " s)";

  return (
    <div className="mc-root">
      <main className="mc-col">
        <header className="mc-head">
          <h1 className="mc-title">Meowchi</h1>
          <p className="mc-sub">Cat sound translator</p>
        </header>

        <div className="mc-tabs" role="tablist" aria-label="Meowchi sections">
          {[["translate", "Translate"], ["call", "Call your cat"]].map(([k, lab]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className="mc-btn px mc-tab">
              {lab}
            </button>
          ))}
        </div>

        <div className="mc-mascot"><CatFace mood={catMood} /></div>
        <div key={bubbleKey} className="px mc-bubble mc-pop" aria-live="polite">{bubble}</div>

        {tab === "translate" ? (
          <>
            <div className="mc-actions">
              <RecButton recording={recording} bars={vizBars} disabled={analyzing} onClick={recording ? stopRecording : startRecording} />
              {recording && <div className="mc-timer"><span className="mc-recdot" />{recSeconds.toFixed(1)} s / {MAX_REC} s</div>}
              <div className="mc-hint">{hint}</div>
              <div className="mc-row">
                <button className="mc-btn px mc-pillbtn" disabled={recording} onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                  Upload a clip
                </button>
                <button className="mc-btn px mc-pillbtn" disabled={recording} onClick={runDemo}>
                  Try a demo clip
                </button>
                <input ref={captureInputRef} id="mc-file-capture" type="file" accept="audio/*" capture="user" onChange={onFile} hidden />
                <input ref={fileInputRef} id="mc-file-upload" type="file" accept="audio/*" onChange={onFile} hidden />
              </div>
            </div>

            <div className="mc-ctx">
              <p className="mc-section-label">Where is your cat right now? It sharpens the guess.</p>
              <div className="mc-chips">
                {CONTEXT_ORDER.map((id) => (
                  <button key={id} className="mc-ctxbtn" aria-pressed={ctx === id} onClick={() => setCtx(ctx === id ? null : id)}>
                    {CONTEXTS[id].label}
                  </button>
                ))}
              </div>
            </div>

            {readable && (
              <div className="px mc-result mc-pop">
                <div>
                  {result.demo && <div className="mc-demo">Demo clip: {result.demo.name}</div>}
                  <div className="mc-result-label">{TYPE_META[result.key].label}</div>
                  <div className="mc-result-mood">Sounds {TYPE_META[result.key].mood}</div>
                  {result.alt && <div className="mc-alt">Could also be: {TYPE_META[result.alt.key].label.toLowerCase()}</div>}
                </div>
                <div className="mc-chips">{chips.map((c, i) => <span key={i} className="mc-chip">{c}</span>)}</div>
                <div className="mc-sure"><span>Confidence in the sound type</span><Hearts conf={result.conf} /></div>
                {!result.demo && QUALITY_NOTES[result.feats.quality] && <div className="mc-quality">{QUALITY_NOTES[result.feats.quality]}</div>}

                <h2 className="mc-h">What they may want from you</h2>
                <ol className="mc-needs">
                  {needs.map((n, i) => (
                    <li key={n.id} className={"mc-need" + (i === 0 ? " mc-need-top" : "")}>
                      <span className="mc-need-name">{NEEDS[n.id].label}</span>
                      <Meter score={n.score} />
                      <span className="mc-need-why">Why: {n.why}.</span>
                      <span className="mc-need-act">Try: {NEEDS[n.id].act}</span>
                    </li>
                  ))}
                </ol>
                {result.aiState === "loading" && <div className="mc-ai">Claude is writing the translation{dots}</div>}
                {result.ai && top && result.ai.need === top.id && <div className="mc-ai-done">Translation written by Claude</div>}
              </div>
            )}

            {history.length > 0 && (
              <div>
                <p className="mc-section-label">Recent sounds</p>
                <div className="mc-chips">
                  {history.map((h) => <span key={h.id} className="mc-chip">{h.label}</span>)}
                </div>
              </div>
            )}

            <p className="mc-note">
              Meowchi reads pitch, length, rhythm and roughness, then ranks what your cat may want.
              It's a best guess, not a diagnosis. A sound that is new, frequent or pained is worth a vet visit.
            </p>
          </>
        ) : (
          <>
            <div className="mc-vol">
              <span className="mc-vol-lab">Quiet</span>
              <input
                className="mc-slider"
                id="mc-volume"
                type="range" min="0" max="1" step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                aria-label="volume"
              />
              <span className="mc-vol-lab">Loud</span>
            </div>
            <div className="mc-grid">
              {SOUNDS.map((s) => (
                <SoundCard key={s.id} s={s} active={playingId === s.id} onToggle={() => playSound(s.id)} />
              ))}
            </div>
            <p className="mc-note">
              Keep the volume low. Cats hear far better than we do, and every cat responds to different sounds.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<MeowchiApp />);
