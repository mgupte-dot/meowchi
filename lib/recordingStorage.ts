import * as FileSystem from 'expo-file-system/legacy';

// Recordings start out in expo-av's temp cache, which iOS/Android can clear
// under storage pressure. Journal entries need to survive across app
// launches, so we copy each recording into the app's private Documents
// directory — sandboxed to Meowchi, not synced anywhere, no extra
// permissions beyond the one-time microphone prompt already granted.
const MEOWS_DIR = `${FileSystem.documentDirectory}meows/`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(MEOWS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MEOWS_DIR, { intermediates: true });
  }
}

export async function persistRecording(tempUri: string, id: string): Promise<string> {
  await ensureDir();
  const ext = tempUri.split('.').pop() || 'm4a';
  const destUri = `${MEOWS_DIR}${id}.${ext}`;
  await FileSystem.copyAsync({ from: tempUri, to: destUri });
  return destUri;
}

export async function deleteRecording(uri?: string) {
  if (!uri) return;
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
}

export const MEOWS_DIRECTORY = MEOWS_DIR;
