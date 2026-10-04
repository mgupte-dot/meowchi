import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export type CallResponse = {
  id: string;
  soundId: string;
  playedAt: number;
  answeredAt: number;
  cameToYou: boolean;
  // Time between the sound finishing and the owner answering. Not the cat's
  // reaction time, but an upper bound on it, and it separates a confident
  // immediate "yes" from one given after a long wait.
  latencyMs: number;
};

export type SoundResponseRate = {
  soundId: string;
  played: number;
  came: number;
  rate: number;
};

const RESPONSES_KEY = 'meowchi.research.callResponses.v1';

export async function loadCallResponses(): Promise<CallResponse[]> {
  const raw = await AsyncStorage.getItem(RESPONSES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CallResponse[];
  } catch {
    return [];
  }
}

export async function addCallResponse(
  input: Omit<CallResponse, 'id' | 'answeredAt' | 'latencyMs'>,
): Promise<CallResponse> {
  const answeredAt = Date.now();
  const response: CallResponse = {
    ...input,
    id: Crypto.randomUUID(),
    answeredAt,
    latencyMs: answeredAt - input.playedAt,
  };
  const current = await loadCallResponses();
  await AsyncStorage.setItem(RESPONSES_KEY, JSON.stringify([response, ...current]));
  return response;
}

export function summarizeBySound(responses: CallResponse[]): SoundResponseRate[] {
  const bySound = new Map<string, { played: number; came: number }>();
  for (const r of responses) {
    const entry = bySound.get(r.soundId) ?? { played: 0, came: 0 };
    entry.played += 1;
    if (r.cameToYou) entry.came += 1;
    bySound.set(r.soundId, entry);
  }
  return [...bySound.entries()].map(([soundId, { played, came }]) => ({
    soundId,
    played,
    came,
    rate: played === 0 ? 0 : came / played,
  }));
}
