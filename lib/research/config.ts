import Constants from 'expo-constants';

// Set `extra.researchApiBaseUrl` in app.json to point the app at a backend.
// While it is unset the app stays fully on-device: responses are still logged
// locally for analysis, nothing is uploaded, and no consent is requested.
export const RESEARCH_API_BASE_URL: string | null =
  (Constants.expoConfig?.extra?.researchApiBaseUrl as string | undefined)?.replace(/\/$/, '') ||
  null;

// Bump when the consent text materially changes, so prior opt-ins are re-asked
// rather than silently carried over to terms the participant never saw.
export const CONSENT_VERSION = 1;

export function isBackendConfigured(): boolean {
  return RESEARCH_API_BASE_URL !== null;
}
