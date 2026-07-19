import AsyncStorage from '@react-native-async-storage/async-storage';

import { deleteRecording } from '@/lib/recordingStorage';
import { MoodResult } from '@/lib/moodAnalyzer';

export type JournalEntry = {
  id: string;
  createdAt: number;
  mood: MoodResult;
  recordingUri?: string;
  durationMs: number;
  note?: string;
  folderId?: string | null;
};

export type JournalFolder = {
  id: string;
  name: string;
  createdAt: number;
};

const STORAGE_KEY = 'catwhisper.journal.v1';
const FOLDERS_KEY = 'catwhisper.journal.folders.v1';

export async function loadJournal(): Promise<JournalEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as JournalEntry[];
    return parsed.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function addJournalEntry(entry: JournalEntry): Promise<JournalEntry[]> {
  const current = await loadJournal();
  const next = [entry, ...current];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function updateJournalEntry(
  id: string,
  patch: Partial<Pick<JournalEntry, 'note' | 'folderId'>>,
): Promise<JournalEntry[]> {
  const current = await loadJournal();
  const next = current.map((e) => (e.id === id ? { ...e, ...patch } : e));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function deleteJournalEntry(id: string): Promise<JournalEntry[]> {
  const current = await loadJournal();
  const target = current.find((e) => e.id === id);
  await deleteRecording(target?.recordingUri);
  const next = current.filter((e) => e.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function loadFolders(): Promise<JournalFolder[]> {
  const raw = await AsyncStorage.getItem(FOLDERS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as JournalFolder[];
    return parsed.sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function createFolder(name: string): Promise<{ folders: JournalFolder[]; folder: JournalFolder }> {
  const current = await loadFolders();
  const folder: JournalFolder = { id: `${Date.now()}`, name: name.trim(), createdAt: Date.now() };
  const next = [...current, folder];
  await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(next));
  return { folders: next, folder };
}

export async function deleteFolder(id: string): Promise<JournalFolder[]> {
  const current = await loadFolders();
  const next = current.filter((f) => f.id !== id);
  await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(next));

  const entries = await loadJournal();
  const reassigned = entries.map((e) => (e.folderId === id ? { ...e, folderId: null } : e));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reassigned));

  return next;
}
