import * as FileSystem from 'expo-file-system/legacy';

import { CallResponse } from '@/lib/research/callResponses';
import { CONSENT_VERSION, RESEARCH_API_BASE_URL } from '@/lib/research/config';

// Contract lives in docs/API_CONTRACT.md — change both together.

export type RecordingUpload = {
  recordingId: string;
  recordedAt: number;
  durationMs: number;
  moodId: string;
  moodConfidence: number;
  fileUri: string;
};

const REQUEST_TIMEOUT_MS = 20_000;

class ResearchApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ResearchApiError';
  }
}

function requireBaseUrl(): string {
  if (!RESEARCH_API_BASE_URL) {
    throw new ResearchApiError('No research API configured');
  }
  return RESEARCH_API_BASE_URL;
}

async function requestJson(path: string, init: RequestInit): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${requireBaseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
    if (!res.ok) {
      throw new ResearchApiError(`${init.method} ${path} failed`, res.status);
    }
  } finally {
    clearTimeout(timeout);
  }
}

export async function registerParticipant(
  participantId: string,
  grantedAt: number,
): Promise<void> {
  await requestJson('/v1/participants', {
    method: 'POST',
    body: JSON.stringify({ participantId, grantedAt, consentVersion: CONSENT_VERSION }),
  });
}

export async function uploadCallResponses(
  participantId: string,
  responses: CallResponse[],
): Promise<void> {
  await requestJson('/v1/call-responses', {
    method: 'POST',
    body: JSON.stringify({ participantId, responses }),
  });
}

export async function uploadRecording(
  participantId: string,
  recording: RecordingUpload,
): Promise<void> {
  const { fileUri, ...metadata } = recording;
  const res = await FileSystem.uploadAsync(`${requireBaseUrl()}/v1/recordings`, fileUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'audio',
    mimeType: 'audio/m4a',
    parameters: {
      participantId,
      recordingId: metadata.recordingId,
      recordedAt: String(metadata.recordedAt),
      durationMs: String(metadata.durationMs),
      moodId: metadata.moodId,
      moodConfidence: String(metadata.moodConfidence),
    },
  });
  if (res.status < 200 || res.status >= 300) {
    throw new ResearchApiError('Recording upload failed', res.status);
  }
}

export async function requestErasure(participantId: string): Promise<void> {
  await requestJson(`/v1/participants/${participantId}`, { method: 'DELETE' });
}
