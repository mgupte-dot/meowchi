# Meowchi 🐾

A kawaii-themed iOS app that helps cat owners understand their cat's meows and call/soothe
their cat with real cat sounds.

For the full project summary, architecture, roadmap, and market research, see
[`docs/Meowchi_Project_Report.docx`](docs/Meowchi_Project_Report.docx).

## What it does

- **Listen** — record a meow and get a heuristic "mood translation" (e.g. Quick Chirp, Long Yowl,
  Soft Chatter) based on the recording's volume, duration, and pattern.
- **Call Kitty** — play real, CC0-licensed cat vocalizations (Come Here!, Cuddle Time, Playtime!,
  Sweet Greeting) to attract, soothe, or engage a cat.
- **Meow Journal** — every recording is saved with play/pause controls, free-text notes, and
  custom folders, so you can track a cat's vocal patterns over time.

Everything currently runs entirely on-device — no backend, no accounts, no cloud sync.

## Tech stack

- React Native (0.86) + Expo SDK 57, TypeScript
- Expo Router (file-based navigation)
- `expo-audio` for recording/playback, `expo-file-system` for persistent local storage
- `@react-native-async-storage/async-storage` for journal/folder data
- A custom "kawaii" pixel-art design system (see `components/kawaii/`)

## Getting started

```bash
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app on your iPhone (same Wi-Fi network as your computer),
or press `w` to run it in a browser for quick UI checks (note: some pixel-art image rendering is
currently broken in the web preview — this is a known `react-native-web` issue, not a bug in the
app itself; native iOS via Expo Go is the real target).

## Project structure

| Path | What's there |
|---|---|
| `app/(tabs)/*.tsx` | The four main screens: Home, Listen, Call Kitty, Journal |
| `lib/moodAnalyzer.ts` | Heuristic feature extraction + mood scoring |
| `lib/callSounds.ts` | Bundled Call Kitty sound metadata |
| `lib/journalStorage.ts` | AsyncStorage CRUD for journal entries and folders |
| `lib/recordingStorage.ts` | Persists recordings to the app's private Documents directory |
| `components/kawaii/*` | Design-system components: cards, buttons, pixel icons, modals |
| `assets/sounds/` | CC0 cat sound clips (see `ATTRIBUTIONS.md` there for sources) |
| `docs/` | Project report for collaborators |

## Status

In active development, tested via Expo Go on iOS. Not yet built for TestFlight/App Store — see
`docs/Meowchi_Project_Report.docx` for the roadmap and current priorities.
