// Heuristic "mood guesser": we don't have a trained cat-vocalization model,
// so instead we extract simple signal-processing features from the
// recording's volume-over-time metering data (duration, loudness, how much
// it varies, and how many separate loud bursts there are) and score them
// against hand-tuned profiles for common cat vocalization patterns. It's a
// stand-in for real audio ML that still reacts believably to real recordings.

import { PixelIconName } from '@/components/kawaii/PixelIcon';

export type MeterSample = { atMs: number; db: number };

export type MoodResult = {
  id: string;
  icon: PixelIconName;
  label: string;
  translation: string;
  advice: string;
  confidence: number; // 0-100, flavor-text only
};

const SILENCE_FLOOR_DB = -55;

function extractFeatures(samples: MeterSample[], durationMs: number) {
  const loud = samples.filter((s) => s.db > SILENCE_FLOOR_DB);
  const dbValues = loud.length ? loud.map((s) => s.db) : samples.map((s) => s.db);

  const avgDb = dbValues.reduce((a, b) => a + b, 0) / (dbValues.length || 1);
  const peakDb = Math.max(...dbValues, SILENCE_FLOOR_DB);
  const variance =
    dbValues.reduce((sum, v) => sum + (v - avgDb) ** 2, 0) / (dbValues.length || 1);
  const stdDev = Math.sqrt(variance);

  // Count bursts: transitions from quiet -> loud, to approximate distinct
  // "meow" pulses rather than one continuous vocalization.
  let bursts = 0;
  let wasLoud = false;
  for (const s of samples) {
    const isLoud = s.db > SILENCE_FLOOR_DB + 6;
    if (isLoud && !wasLoud) bursts++;
    wasLoud = isLoud;
  }

  return {
    durationSec: durationMs / 1000,
    avgDb,
    peakDb,
    stdDev,
    bursts: Math.max(bursts, loud.length ? 1 : 0),
  };
}

type Profile = Omit<MoodResult, 'confidence'> & {
  score: (f: ReturnType<typeof extractFeatures>) => number;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
// Triangular membership: 1.0 at target, fading to 0 at target +/- width.
const near = (value: number, target: number, width: number) =>
  clamp01(1 - Math.abs(value - target) / width);

const PROFILES: Profile[] = [
  {
    id: 'quick-chirp',
    icon: 'bird',
    label: 'Quick Chirp',
    translation: '"Oh, hi there!"',
    advice: 'A short, friendly hello. Try a soft chirp back to say hi in return.',
    score: (f) =>
      near(f.durationSec, 0.4, 0.6) * 0.6 + near(f.bursts, 1, 1.5) * 0.4,
  },
  {
    id: 'repeated-meows',
    icon: 'catface',
    label: 'Repeated Meows',
    translation: '"Hey. Hey! HEY. Are you listening?"',
    advice: 'Multiple insistent calls usually mean a request — check food, water, or the litter box.',
    score: (f) => near(f.bursts, 4, 3) * 0.7 + near(f.durationSec, 2.5, 2) * 0.3,
  },
  {
    id: 'yowl',
    icon: 'megaphone',
    label: 'Long Yowl',
    translation: '"This is urgent and I need it NOW."',
    advice: 'A loud, sustained call often signals urgency or discomfort — worth a closer check-in.',
    score: (f) =>
      near(f.durationSec, 3, 2) * 0.4 + near(f.peakDb, -10, 15) * 0.35 + near(f.stdDev, 3, 4) * 0.25,
  },
  {
    id: 'content-purr-chat',
    icon: 'zzz',
    label: 'Soft Chatter',
    translation: '"Just keeping you company, no big deal."',
    advice: 'Low, steady, relaxed sound — your cat seems calm and comfortable.',
    score: (f) =>
      near(f.avgDb, -35, 15) * 0.45 + near(f.stdDev, 2, 3) * 0.35 + near(f.durationSec, 2, 2) * 0.2,
  },
  {
    id: 'trill-greeting',
    icon: 'musicnote',
    label: 'Chirrup Trill',
    translation: '"Follow me, I want to show you something!"',
    advice: 'That wavering trill is a classic friendly invitation — see where they lead you.',
    score: (f) => near(f.stdDev, 6, 4) * 0.6 + near(f.durationSec, 1, 1) * 0.4,
  },
  {
    id: 'mystery-meow',
    icon: 'question',
    label: 'Mystery Meow',
    translation: '"...you\'ll just have to guess!"',
    advice: "Even seasoned cat whisperers get stumped sometimes. Try recording again a bit closer.",
    score: () => 0.22, // low flat baseline so this only wins when nothing else fits
  },
];

export function analyzeMood(samples: MeterSample[], durationMs: number): MoodResult {
  const features = extractFeatures(samples, durationMs);
  const scored = PROFILES.map((p) => ({ profile: p, score: p.score(features) }));
  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0];
  const runnerUpScore = scored[1]?.score ?? 0;
  const spread = Math.max(winner.score - runnerUpScore, 0.05);
  const confidence = Math.round(clamp01(0.55 + spread * 0.9) * 100);

  const { score: _score, ...rest } = winner.profile;
  return { ...rest, confidence };
}
