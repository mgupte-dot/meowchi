import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { CONSENT_VERSION } from '@/lib/research/config';

export type ConsentRecord = {
  // Random per-install UUID. Deliberately not derived from any device or
  // account identifier, so uploaded data cannot be linked back to a person.
  participantId: string;
  grantedAt: number;
  version: number;
};

const CONSENT_KEY = 'meowchi.research.consent.v1';

export async function loadConsent(): Promise<ConsentRecord | null> {
  const raw = await AsyncStorage.getItem(CONSENT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ConsentRecord;
    // A stale consent version means the participant agreed to different terms.
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function grantConsent(): Promise<ConsentRecord> {
  const record: ConsentRecord = {
    participantId: Crypto.randomUUID(),
    grantedAt: Date.now(),
    version: CONSENT_VERSION,
  };
  await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify(record));
  return record;
}

// Callers should enqueue a server-side erasure request with the returned
// participantId *before* awaiting this, since the id is unrecoverable after.
export async function revokeConsent(): Promise<void> {
  await AsyncStorage.removeItem(CONSENT_KEY);
}
