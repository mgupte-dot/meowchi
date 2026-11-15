// ------------------------------------------------------------------
// What the cat may want: needs, how the sound and the setting point to them, plain-voiced lines, demo clips
// ------------------------------------------------------------------

const TYPE_META = {
  quiet: { label: "Too quiet to read", mood: "" },
  hiss: { label: "Hiss or growl", mood: "defensive" },
  purr: { label: "Purr", mood: "settled" },
  chatter: { label: "Chatter", mood: "fixed on prey" },
  yowl: { label: "Yowl", mood: "calling out, possibly distressed" },
  trill: { label: "Trill", mood: "friendly" },
  meow_hungry: { label: "High, urgent meow", mood: "insistent" },
  meow_question: { label: "Rising meow", mood: "asking for something" },
  meow_grumpy: { label: "Low, falling meow", mood: "unhappy about something" },
  meow_hi: { label: "Short meow", mood: "friendly" },
  meow_chat: { label: "Mid-pitch meow", mood: "talkative" },
  grumble: { label: "Low grumble", mood: "irritated" },
  mystery: { label: "Unclear sound", mood: "hard to read" },
};

const NEEDS = {
  food: { label: "Food or water", face: "excited",
    act: "Check the bowl and how long it has been since the last meal. Top up the water too." },
  attention: { label: "Play or attention", face: "excited",
    act: "Ten minutes with a wand toy, then a small snack, covers most of this." },
  cuddles: { label: "Affection", face: "happy",
    act: "Offer a lap or a chin scratch and let them decide how close to get." },
  lonely: { label: "Company", face: "surprised",
    act: "Call back or go to them. If it happens while you're out, a play session before you leave helps." },
  anxious: { label: "Reassurance (anxious)", face: "upset",
    act: "Lower the noise, give them a hiding spot or a high perch, and don't force contact." },
  litter: { label: "Litter box", face: "upset",
    act: "Check that the box is clean and easy to reach. Crying or straining inside the box needs a vet call the same day." },
  pain: { label: "Relief (discomfort)", face: "upset",
    act: "Watch for hiding, limping or skipped meals. If this sound is new or keeps coming back, call your vet." },
  space: { label: "Space", face: "upset",
    act: "Stop what you're doing, step back and leave them a way out. Let them come to you." },
  hunt: { label: "To hunt", face: "excited",
    act: "They can see prey they can't reach. A wand toy lets them finish the chase." },
  greet: { label: "To say hello", face: "happy",
    act: "Say hi back. Cats that get an answer tend to keep talking to you." },
  follow: { label: "You to follow", face: "happy",
    act: "Go with them and see where they stop: the bowl, a door or a favorite spot." },
  door: { label: "A door opened", face: "surprised",
    act: "Look for a closed door between them and you, the litter box or a window." },
  content: { label: "Nothing, they're content", face: "sleepy",
    act: "Nothing to fix. A slow blink tells them you feel the same." },
};

const LINES = {
  food: [
    "I'm hungry. Can you check my bowl?",
    "It's past my usual mealtime and I've noticed.",
    "I'd like something to eat, and I'm going to keep asking.",
    "My bowl needs attention. Food or fresh water, please.",
  ],
  attention: [
    "I'm bored. Come do something with me.",
    "I have energy to burn. Can we play for a few minutes?",
    "You've been busy for a while. I'd like some of your time.",
    "Look at me for a second. I want to be involved.",
  ],
  cuddles: [
    "I'd like to be close to you right now.",
    "Make some room. I want to settle next to you.",
    "A chin scratch would be welcome.",
    "I'm in the mood for company and a warm lap.",
  ],
  lonely: [
    "Where did everyone go? I don't like being on my own this long.",
    "I've been calling. Can you come find me?",
    "The house is too quiet. I want to know you're here.",
    "I can't see you, and I'd feel better if I could.",
  ],
  anxious: [
    "Something has me on edge. I need things calmer.",
    "I don't feel safe right now. Give me a minute.",
    "That was too much for me. I'm unsettled.",
    "I'm worried and I don't know what to do about it.",
  ],
  litter: [
    "Something's wrong with my litter box. Please take a look.",
    "My box isn't how I like it, and I need to go.",
    "I'm telling you about the litter box before it becomes a problem.",
    "I need the bathroom sorted out.",
  ],
  pain: [
    "Something doesn't feel right in my body.",
    "I'm uncomfortable and I can't settle.",
    "This is bothering me enough to say so.",
    "I don't feel well. Please pay attention to how I'm acting.",
  ],
  space: [
    "Back off, please. I need room.",
    "I've had enough of that. Stop.",
    "Don't come closer. I'll come to you when I'm ready.",
    "That's my limit. Give me some distance.",
  ],
  hunt: [
    "There's prey right there and I can't get to it.",
    "I'm locked onto something. Every part of me wants to pounce.",
    "It's so close. This is frustrating.",
    "I've spotted something to hunt.",
  ],
  greet: [
    "Hi. Good to see you.",
    "You're back. I noticed.",
    "Hello. Just checking in.",
    "There you are.",
  ],
  follow: [
    "Come with me. I want to show you something.",
    "This way. Follow me.",
    "I need you over here, not over there.",
  ],
  door: [
    "Open this door, please. I want to be on the other side.",
    "This door is in my way.",
    "Let me through. I don't like being shut out.",
  ],
  content: [
    "I'm comfortable. Don't change anything.",
    "This is good. I feel safe here.",
    "I'm relaxed and happy where I am.",
    "All is well. Stay a while.",
  ],
};
const QUIET_LINE = "I couldn't hear a cat in that clip. Try again a little closer.";
const BACKGROUND_LINE = "I could only hear steady background noise. Try again somewhere quieter, close to your cat.";
const QUALITY_NOTES = {
  noisy: "There was a lot of background noise, so treat this as a rough read.",
  faint: "The clip was very quiet. Recording closer to your cat will give a better read.",
  clipped: "The recording was loud enough to distort, which can throw off the pitch.",
};
// ---- local line composer: builds the spoken line on the device, no AI service needed ----
// Most specific match wins: the setting, then the kind of sound, then how urgent it was, then the general lines.
const SETTING_LINES = {
  "food|bowl": ["I'm standing at my bowl for a reason. Please fill it.", "The bowl is right here and it's empty, or not what I wanted.", "This is where the food goes. I'm waiting."],
  "food|night": ["I know it's early. I'm hungry anyway.", "My stomach doesn't care what time it is. Breakfast, please."],
  "lonely|night": ["The house went quiet and I don't know where you are.", "It's dark and I'd like to know you're still here."],
  "lonely|door": ["You're on the other side of this door and I don't like it.", "I can hear you in there. Let me be where you are."],
  "door|door": ["Open this door, please. I want to be on the other side.", "This door is closed and I need it not to be.", "I'm stuck on the wrong side of this door."],
  "litter|litter": ["My litter box needs cleaning before I'll use it.", "Something about this box is wrong. Please look.", "I need to go, and the box isn't right."],
  "pain|litter": ["It hurts when I try to go. Please don't ignore this.", "Something is wrong when I use the box. I need help."],
  "cuddles|lap": ["Stay right here. I want to be on you.", "This is the spot. A few chin scratches and I'm set.", "I came over here to be close to you."],
  "content|lap": ["I'm warm and comfortable. Don't move.", "This is exactly where I want to be."],
  "attention|lap": ["I'm right here next to you. Put that down and look at me.", "You're within reach, so let's do something together."],
  "hunt|window": ["There's a bird out there and the glass is in my way.", "I can see it. I can't reach it. This is maddening."],
  "space|window": ["Something outside is in my territory and I don't like it.", "There's an intruder out there. I'm warning it off."],
  "anxious|hiding": ["I'm hiding because I don't feel safe. Leave me be for now.", "Something scared me. I need to stay tucked away for a while.", "It's too much out there. I'll come out when it's calm."],
  "space|hiding": ["I'm in here to be left alone. Please don't reach in.", "Don't pull me out. I'll come when I'm ready."],
  "space|lap": ["That's enough touching. I'd like to stay, but stop.", "I was enjoying that until I wasn't. Hands off for now."],
};
const SOUND_LINES = {
  "content|purr": ["I'm purring because everything is fine. Stay put.", "This is my happy sound. Keep doing what you're doing."],
  "cuddles|purr": ["I'm purring for you. Come closer.", "I like this. A little more, please."],
  "food|purr": ["I'm purring, but listen closely: I'm asking for food.", "This purr has a request in it. It's mealtime."],
  "anxious|purr": ["I'm purring to calm myself down. I'm not relaxed.", "This isn't a happy purr. I'm trying to settle my nerves."],
  "pain|purr": ["I'm purring to comfort myself. Something doesn't feel right."],
  "greet|trill": ["Oh, it's you. Hello!", "There you are. I'm glad you're back."],
  "follow|trill": ["Come on, this way. I'll show you.", "Follow me. It's important."],
  "space|hiss": ["Stop. Don't come any closer.", "That's a warning. Back away."],
  "anxious|hiss": ["I'm frightened, and I'll defend myself if I have to.", "I'm scared. Give me room and time."],
  "space|grumble": ["I'm putting up with this, but only just. Stop soon.", "You're pushing it. Leave me alone."],
  "lonely|yowl": ["Where is everyone? I've been calling and calling.", "I'm alone and I don't like it. Come find me."],
  "anxious|yowl": ["Something is very wrong and I need you to notice.", "I'm upset and I can't settle. Please come."],
  "pain|yowl": ["Something hurts. I wouldn't be this loud otherwise.", "I'm in distress. Please check on me."],
  "litter|yowl": ["Something is wrong when I try to use my box.", "I need help with the litter box. This isn't normal for me."],
  "hunt|chatter": ["It's right there. So close. I can almost taste it.", "My jaw does this when I see prey I can't reach."],
};
const URGENT_LINES = {
  food: ["I'm really hungry and I've asked more than once.", "Food. Now, please. I'm not going to stop asking."],
  attention: ["I've been trying to get your attention for a while now.", "Look at me. I need something to do right now."],
  lonely: ["I've been calling and nobody has come. Where are you?"],
  door: ["Let me through. I've asked several times."],
  cuddles: ["I really want to be near you right now. Make room."],
};
const ALSO = {
  food: "I wouldn't say no to food either.",
  attention: "I'd like some of your time too.",
  cuddles: "Some affection would help as well.",
  lonely: "I'd also feel better with you nearby.",
  anxious: "I'm a little on edge too.",
  litter: "Check my litter box while you're at it.",
  pain: "Something may be bothering me physically as well.",
  space: "A little room would help too.",
  door: "There's also a door I'd like opened.",
};

function composeLine(needs, key, f, ctxId, seed) {
  const top = needs[0];
  if (!top) return QUIET_LINE;
  const urgent = f.loudWord === "loud" || (f.numSeg || 1) >= 3;
  const pool =
    (key === "yowl" && SOUND_LINES[top.id + "|" + key]) || // a yowl is distress: say so before anything gentler
    (ctxId && SETTING_LINES[top.id + "|" + ctxId]) ||
    SOUND_LINES[top.id + "|" + key] ||
    (urgent && URGENT_LINES[top.id]) ||
    LINES[top.id] || LINES.attention;
  let line = pool[seed % pool.length];
  // a close second need gets a short mention, so mixed signals aren't flattened into one
  const second = needs[1];
  if (second && ALSO[second.id] && top.id !== "content" && top.id !== "greet" && second.score >= 0.5 && second.score >= 0.8 * top.score && line.length < 70) {
    line += " " + ALSO[second.id];
  }
  return line;
}

// Where the cat is. Sound alone can't separate food from litter box; the setting can.
const CONTEXTS = {
  bowl: { label: "By the food bowl", why: "they're by the food bowl", boost: { food: 0.4 }, less: [] },
  door: { label: "At a door", why: "they're at a closed door", boost: { door: 0.55, lonely: 0.15 }, less: ["food"] },
  litter: { label: "Near the litter box", why: "they're near the litter box", boost: { litter: 0.5, pain: 0.1 }, less: ["food", "attention"] },
  lap: { label: "On or next to me", why: "they're right next to you", boost: { cuddles: 0.35, content: 0.15 }, less: ["lonely", "door"] },
  window: { label: "At a window", why: "they're at a window", boost: { hunt: 0.4 }, less: ["food"] },
  hiding: { label: "Hiding", why: "they're hiding", boost: { anxious: 0.4, space: 0.2, pain: 0.15 }, less: ["food", "attention", "greet"] },
  night: { label: "Woke me up", why: "it's the middle of the night or very early", boost: { lonely: 0.3, food: 0.2 }, less: [] },
};
const CONTEXT_ORDER = ["bowl", "door", "litter", "lap", "window", "hiding", "night"];

function inferNeeds(key, f, ctxId) {
  const s = {}, heard = {}, seen = {};
  const add = (id, v, w) => {
    s[id] = (s[id] || 0) + v;
    if (w && (!heard[id] || v >= heard[id].v)) heard[id] = { v, w };
  };
  const p = Math.round(f.medianPitch || 0), dur = f.longestSeg || 0, rep = f.numSeg || 1;
  const loud = f.loudWord === "loud", rising = f.contourWord === "rising", falling = f.contourWord === "falling";
  const isMeow = key.indexOf("meow_") === 0;

  if (key === "purr") {
    add("content", 0.7, f.pulseRate ? "a steady rumble pulsing about " + Math.round(f.pulseRate) + " times a second, with no strain in it" : "a steady, low rumble with no strain in it");
    add("cuddles", 0.45, "purring mostly happens during close contact");
    if (f.avgCentroid > 380) add("food", 0.5, "there's a higher cry mixed into the purr, the kind cats use when they want feeding");
    add("pain", 0.12, "cats sometimes purr to soothe themselves");
  } else if (key === "trill") {
    add("greet", 0.7, "a short, rising chirrup made with the mouth closed");
    add("follow", 0.5, "mother cats use this sound to call kittens along");
    add("cuddles", 0.3, "trills are aimed at someone they like");
    add("food", 0.2, "some cats trill on the way to the bowl");
    if (rep >= 2) add("follow", 0.25, "repeated trills usually mean 'come on'");
  } else if (key === "chatter") {
    add("hunt", 0.85, "fast, clipped bursts (" + rep + " in a row), the jaw chatter cats make at prey");
    add("attention", 0.45, "it signals pent-up energy that play can use up");
  } else if (key === "hiss") {
    add("space", 0.85, "a noisy burst with no musical pitch, which is a warning");
    add("anxious", 0.6, "hissing comes from fear more often than anger");
    add("pain", 0.25, "a hiss when touched can mean a sore spot");
  } else if (key === "yowl") {
    add("lonely", 0.55, "a long, drawn-out call (" + dur.toFixed(1) + " s) meant to carry");
    add("anxious", 0.5, "the pitch wavers, which goes with distress");
    add("pain", 0.4, "long, loud vocalizing can come from discomfort");
    add("litter", 0.25, "cats sometimes cry out around the litter box");
    if (loud) add("pain", 0.1);
    if (rep >= 3) add("lonely", 0.1);
    if ((f.rangeSt || 0) > 3) add("anxious", 0.08, "the pitch swings across " + f.rangeSt.toFixed(0) + " semitones, which goes with distress");
  } else if (key === "meow_hungry") {
    add("food", 0.7, "a high-pitched meow (" + p + " Hz) with urgency in it");
    add("attention", 0.45, "high, insistent meows are requests aimed at you");
    add("door", 0.25, "an insistent meow is often about a barrier");
    add("lonely", 0.2, "insistent calling can mean they want you nearby");
  } else if (key === "meow_question") {
    add("attention", 0.55, "a rising, question-like meow");
    add("food", 0.45, "rising meows are common when asking for food");
    add("cuddles", 0.3, "a soft request aimed at you");
    add("door", 0.25, "a questioning meow often means 'can you open this'");
    add("follow", 0.2, "they may want you to come along");
  } else if (key === "meow_grumpy") {
    add("anxious", 0.4, "a low meow (" + p + " Hz) that falls in pitch");
    add("litter", 0.35, "low complaint meows are common when something in their territory is off, like a dirty box");
    add("space", 0.3, "low pitch signals displeasure");
    add("pain", 0.3, "a low, falling meow can come from discomfort");
    add("food", 0.2, "some cats complain about an empty bowl this way");
  } else if (key === "meow_hi") {
    add("greet", 0.75, "short and light, under half a second");
    add("attention", 0.4, "a quick check-in aimed at you");
    add("cuddles", 0.35, "greeting meows often come before asking for contact");
    add("food", 0.2, "a short meow can also be a polite request");
  } else if (key === "meow_chat") {
    add("attention", 0.55, "a mid-pitch, conversational meow (" + p + " Hz)");
    add("cuddles", 0.4, "relaxed pitch with no urgency");
    add("food", 0.4, "this is the standard request meow");
    add("greet", 0.3, "an easy, social sound");
    add("lonely", 0.25, "talkative cats often want you nearby");
  } else if (key === "grumble") {
    add("space", 0.6, "a low grumble (" + p + " Hz) is a warning to stop");
    add("anxious", 0.4, "low, tense sounds go with unease");
    add("pain", 0.3, "grumbling when handled can mean a sore spot");
    add("litter", 0.15, "low complaints can be about the box");
  } else {
    add("attention", 0.35, "the sound didn't match a clear pattern");
    add("food", 0.3, "the sound didn't match a clear pattern");
    add("anxious", 0.2, "the sound didn't match a clear pattern");
  }

  if (isMeow) {
    if (rising) add("food", 0.08, "the pitch rises at the end, as it does in most food requests");
    if (falling) add("anxious", 0.1, "the pitch falls, which is more common in stressed meows");
    if (dur > 0.9) add("lonely", 0.15, "the meow is long and drawn out (" + dur.toFixed(1) + " s)");
    if (rep >= 3) { add("attention", 0.1, "repeated " + rep + " times in a row"); add("food", 0.08); }
    if (loud) add("pain", 0.08, "louder than an ordinary request");
  }

  if ((isMeow || key === "yowl") && (f.rough || 0) > 0.5) {
    add("anxious", 0.12, "the voice is rough and strained instead of clear");
    add("pain", 0.1, "the voice is rough and strained instead of clear");
  }

  const c = CONTEXTS[ctxId];
  if (c) {
    c.less.forEach((id) => { if (s[id]) s[id] *= 0.6; });
    Object.keys(c.boost).forEach((id) => { s[id] = (s[id] || 0) + c.boost[id]; seen[id] = c.why; });
    if (key === "purr" && ctxId === "hiding") {
      s.content *= 0.35; s.cuddles *= 0.4;
      s.anxious += 0.25; heard.anxious = { v: 1, w: "cats also purr to calm themselves when they're scared" };
    }
  }

  return Object.keys(s)
    .map((id) => ({
      id,
      score: Math.min(0.95, s[id]),
      why: [heard[id] && heard[id].w, seen[id]].filter(Boolean).join(", and "),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// Demo clips: [name, sound type, setting, pitch Hz, length s, repeats, contour, loudness, extra]
const DEMOS = [
  ["Breakfast is late", "meow_hungry", "bowl", 780, 0.7, 4, "rising", "loud"],
  ["Staring at the treat cupboard", "meow_question", "bowl", 600, 0.5, 2, "rising", "medium"],
  ["5 a.m. wake-up call", "meow_hungry", "night", 720, 1.1, 5, "rising", "loud"],
  ["Following you into the kitchen", "meow_chat", "bowl", 520, 0.6, 3, "steady", "medium"],
  ["Purring at the food bowl", "purr", "bowl", 0, 2.6, 1, "steady", "soft", { cen: 430 }],
  ["Asleep on your lap", "purr", "lap", 0, 3.2, 1, "steady", "soft", { cen: 240 }],
  ["Purring on the vet's table", "purr", "hiding", 0, 2.2, 1, "steady", "soft", { cen: 260 }],
  ["Pawing at your leg on the couch", "meow_question", "lap", 560, 0.45, 2, "rising", "soft"],
  ["You just got home", "meow_hi", null, 620, 0.25, 3, "steady", "medium"],
  ["Chirp as you walk in", "trill", null, 660, 0.35, 1, "rising", "medium"],
  ["Leading you down the hall", "trill", null, 700, 0.4, 3, "rising", "medium"],
  ["Dropped a toy at your feet", "meow_question", null, 580, 0.45, 2, "rising", "medium"],
  ["Chatty while you work", "meow_chat", null, 500, 0.5, 2, "steady", "medium"],
  ["Shut out of the bedroom", "yowl", "door", 480, 1.9, 3, "falling", "loud", { v: 0.2 }],
  ["Shut in the closet", "meow_hungry", "door", 800, 0.6, 5, "rising", "loud"],
  ["Home alone, heard on the pet camera", "yowl", null, 430, 2.0, 3, "steady", "medium", { v: 0.18 }],
  ["Older cat calling at night", "yowl", "night", 400, 2.4, 3, "steady", "loud", { v: 0.15 }],
  ["Dirty litter box", "meow_grumpy", "litter", 400, 0.8, 2, "falling", "medium"],
  ["Crying inside the litter box", "yowl", "litter", 520, 1.6, 2, "falling", "loud", { v: 0.25 }],
  ["Bird outside the window", "chatter", "window", 500, 0.15, 7, "steady", "medium"],
  ["Fly on the ceiling", "chatter", null, 540, 0.12, 5, "steady", "soft"],
  ["A stranger in the house", "hiss", "hiding", 0, 0.6, 1, "steady", "medium"],
  ["Belly rub went on too long", "grumble", "lap", 180, 0.7, 1, "falling", "medium"],
  ["In the carrier", "yowl", "hiding", 450, 2.2, 4, "falling", "loud", { v: 0.22 }],
  ["Thunderstorm", "meow_grumpy", "hiding", 380, 0.9, 2, "falling", "medium"],
  ["Another cat in the yard", "grumble", "window", 200, 1.2, 1, "falling", "medium"],
].map((d) => ({ name: d[0], key: d[1], ctx: d[2], p: d[3], dur: d[4], rep: d[5], contour: d[6], loud: d[7], x: d[8] || {} }));

function demoClipFeats(d) {
  const noisy = d.key === "hiss";
  return {
    maxRms: d.loud === "loud" ? 0.3 : d.loud === "soft" ? 0.03 : 0.1,
    numSeg: d.rep, totalVoiced: +(d.dur * d.rep).toFixed(2), avgSegDur: d.dur, longestSeg: d.dur,
    medianPitch: d.p, contour: d.contour === "rising" ? 1.2 : d.contour === "falling" ? 0.85 : 1,
    contourWord: d.contour, pitchVar: d.x.v || 0.06,
    avgFlat: noisy ? 0.4 : 0.12, avgCentroid: d.x.cen || (d.key === "purr" ? 250 : 900),
    avgLowRatio: d.key === "purr" ? 0.7 : 0.2, avgClarity: noisy ? 0.2 : 0.8, loudWord: d.loud,
  };
}

const SOUND_COPY = {
  pspsps: { name: "Pspsps", tag: "Come here", line: "The classic come-here call." },
  purr: { name: "Purr", tag: "Calm and cuddle", line: "A slow purr to help them settle." },
  birds: { name: "Birdsong", tag: "Get attention", line: "Birdsong to get their attention." },
  mouse: { name: "Mouse squeaks", tag: "Start play", line: "Mouse squeaks to start a hunt." },
  mew: { name: "Kitten mew", tag: "Spark curiosity", line: "A kitten mew. Curious cats come to look." },
  crinkle: { name: "Treat crinkle", tag: "Treat time", line: "A treat bag crinkle. Follow through with a treat." },
};

// Claude writes the line when the page runs inside Claude; elsewhere the built-in lines are used.
let samplePromise = null;
function getSample() {
  if (!samplePromise) {
    samplePromise = (typeof window !== "undefined" && window.claude && window.claude.use)
      ? window.claude.use("sample").catch(() => null)
      : Promise.resolve(null);
  }
  return samplePromise;
}

async function fetchAiTranslation(payload) {
  const sample = await getSample();
  if (sample) {
    const prompt =
      "You write one line for Meowchi, an app that interprets cat sounds for their owners. " +
      "Here is the acoustic analysis of a cat vocalization and the needs it most likely points to, most likely first: " +
      JSON.stringify(payload) + "\n" +
      "Write what the cat is most plausibly communicating, in first person as the cat, grounded in the first need. " +
      "Use plain, natural adult English: warm, direct, specific. No baby talk, no 'hooman', no puns, no cat-speak spellings, " +
      "no emoji, at most one exclamation mark. One or two short sentences.\n" +
      'Respond with ONLY minified JSON, no markdown: {"translation":"..."}';
    const value = await sample.json(prompt, { modelTier: "quick" });
    if (!value || typeof value.translation !== "string") throw new Error("bad shape");
    return value;
  }
  // standalone app: ask the translation service set in config.js, and give up after 8 seconds
  const url = (typeof window !== "undefined" && window.MEOWCHI_TRANSLATE_URL) || "";
  if (!url) throw new Error("no translation service");
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(payload), signal: ctl.signal,
    });
    if (!res.ok) throw new Error("service " + res.status);
    const j = await res.json();
    if (!j || typeof j.translation !== "string" || !j.translation.trim()) throw new Error("bad shape");
    return { translation: j.translation.trim().slice(0, 280) };
  } finally {
    clearTimeout(timer);
  }
}
