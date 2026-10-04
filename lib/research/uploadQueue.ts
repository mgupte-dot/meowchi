import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { loadJournal } from '@/lib/journalStorage';
import { loadCallResponses } from '@/lib/research/callResponses';
import {
  registerParticipant,
  requestErasure,
  uploadCallResponses,
  uploadRecording,
} from '@/lib/research/client';
import { isBackendConfigured } from '@/lib/research/config';
import { loadConsent } from '@/lib/research/consent';

export type QueueKind = 'participant' | 'recording' | 'call_response' | 'erasure';

export type QueueItem = {
  id: string;
  kind: QueueKind;
  // Journal entry id, call response id, or participant id depending on kind.
  refId: string;
  createdAt: number;
  attempts: number;
  lastError: string | null;
};

const QUEUE_KEY = 'meowchi.research.uploadQueue.v1';
const MAX_ATTEMPTS = 5;

let flushing = false;

export async function loadQueue(): Promise<QueueItem[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueueItem[];
  } catch {
    return [];
  }
}

async function saveQueue(items: QueueItem[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

async function append(kind: QueueKind, refId: string): Promise<void> {
  const items = await loadQueue();
  items.push({
    id: Crypto.randomUUID(),
    kind,
    refId,
    createdAt: Date.now(),
    attempts: 0,
    lastError: null,
  });
  await saveQueue(items);
}

// Data captured before the participant opted in is never enqueued, so opting in
// shares what happens next rather than retroactively uploading existing history.
export async function enqueueIfConsented(
  kind: Exclude<QueueKind, 'erasure'>,
  refId: string,
): Promise<void> {
  if (!isBackendConfigured()) return;
  if (!(await loadConsent())) return;
  await append(kind, refId);
}

// Erasure is deliberately exempt from the consent check: it is enqueued as
// consent is being withdrawn, and must still be delivered afterwards.
export async function enqueueErasure(participantId: string): Promise<void> {
  if (!isBackendConfigured()) return;
  await append('erasure', participantId);
}

async function runItem(item: QueueItem, participantId: string | null): Promise<void> {
  if (item.kind === 'erasure') {
    await requestErasure(item.refId);
    return;
  }

  if (!participantId) {
    throw new Error('No active consent');
  }

  if (item.kind === 'participant') {
    const consent = await loadConsent();
    await registerParticipant(item.refId, consent?.grantedAt ?? item.createdAt);
    return;
  }

  if (item.kind === 'recording') {
    const entry = (await loadJournal()).find((e) => e.id === item.refId);
    // Deleted from the journal before it was ever uploaded — nothing to send.
    if (!entry?.recordingUri) return;
    await uploadRecording(participantId, {
      recordingId: entry.id,
      recordedAt: entry.createdAt,
      durationMs: entry.durationMs,
      moodId: entry.mood.id,
      moodConfidence: entry.mood.confidence,
      fileUri: entry.recordingUri,
    });
    return;
  }

  const response = (await loadCallResponses()).find((r) => r.id === item.refId);
  if (!response) return;
  await uploadCallResponses(participantId, [response]);
}

export async function flushQueue(): Promise<void> {
  if (flushing || !isBackendConfigured()) return;
  flushing = true;
  try {
    const items = await loadQueue();
    if (items.length === 0) return;

    const participantId = (await loadConsent())?.participantId ?? null;
    const remaining: QueueItem[] = [];

    for (const item of items) {
      if (item.attempts >= MAX_ATTEMPTS) {
        remaining.push(item);
        continue;
      }
      // Without consent only erasure can proceed; the rest wait, in case the
      // participant opts back in.
      if (!participantId && item.kind !== 'erasure') {
        remaining.push(item);
        continue;
      }
      try {
        await runItem(item, participantId);
      } catch (error) {
        remaining.push({
          ...item,
          attempts: item.attempts + 1,
          lastError: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    await saveQueue(remaining);
  } finally {
    flushing = false;
  }
}
