import { Ionicons } from '@expo/vector-icons';
import {
  AudioPlayer,
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { GradientBackground } from '@/components/kawaii/GradientBackground';
import { KawaiiCard } from '@/components/kawaii/KawaiiCard';
import { PawButton } from '@/components/kawaii/PawButton';
import { PixelBars } from '@/components/kawaii/PixelBars';
import { PixelIcon } from '@/components/kawaii/PixelIcon';
import { PixelPawTrail } from '@/components/kawaii/PixelPawTrail';
import { ScreenHeader } from '@/components/kawaii/ScreenHeader';
import { Fonts, Radii, Shadow, Spacing, Theme } from '@/constants/theme';
import { addJournalEntry } from '@/lib/journalStorage';
import { analyzeMood, MeterSample, MoodResult } from '@/lib/moodAnalyzer';
import { persistRecording } from '@/lib/recordingStorage';
import { enqueueIfConsented, flushQueue } from '@/lib/research/uploadQueue';

type Stage = 'idle' | 'recording' | 'analyzing' | 'result' | 'permission-denied';

const RECORDER_OPTIONS = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };

export default function ListenScreen() {
  const [stage, setStage] = useState<Stage>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [mood, setMood] = useState<MoodResult | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  const recorder = useAudioRecorder(RECORDER_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 100);
  const samplesRef = useRef<MeterSample[]>([]);
  const startedAtRef = useRef(0);
  const pulse = useRef(new Animated.Value(1)).current;
  const playbackRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    if (stage === 'recording') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.18,
            duration: 550,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 550,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    pulse.setValue(1);
  }, [stage, pulse]);

  useEffect(() => {
    if (stage !== 'recording' || !recorderState.isRecording) return;
    samplesRef.current.push({
      atMs: recorderState.durationMillis,
      db: recorderState.metering ?? -60,
    });
    setElapsedMs(recorderState.durationMillis);
  }, [stage, recorderState]);

  useEffect(() => {
    return () => {
      playbackRef.current?.remove();
    };
  }, []);

  async function startRecording() {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setStage('permission-denied');
      return;
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    samplesRef.current = [];
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    setMood(null);
    setRecordingUri(null);

    await recorder.prepareToRecordAsync();
    recorder.record();
    setStage('recording');
  }

  async function stopRecording() {
    setStage('analyzing');

    await recorder.stop();
    const tempUri = recorder.uri;

    const durationMs = Date.now() - startedAtRef.current;
    const result = analyzeMood(samplesRef.current, durationMs);
    const id = `${Date.now()}`;
    const persistedUri = tempUri ? await persistRecording(tempUri, id) : undefined;
    setRecordingUri(persistedUri ?? null);

    setTimeout(async () => {
      setMood(result);
      setStage('result');
      await addJournalEntry({
        id,
        createdAt: Date.now(),
        mood: result,
        recordingUri: persistedUri,
        durationMs,
        folderId: null,
      });
      await enqueueIfConsented('recording', id);
      flushQueue();
    }, 650);
  }

  function playRecording() {
    if (!recordingUri) return;
    playbackRef.current?.remove();
    const player = createAudioPlayer(recordingUri);
    playbackRef.current = player;
    player.play();
  }

  function reset() {
    setStage('idle');
    setMood(null);
    setRecordingUri(null);
    setElapsedMs(0);
  }

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          icon="headphones"
          title="Listen In"
          subtitle="Record a meow and get a cute translation of your cat's mood."
        />

        {stage === 'permission-denied' && (
          <KawaiiCard style={styles.centerCard}>
            <PixelIcon name="alert" size={56} />
            <Text style={styles.resultLabel}>Microphone access needed</Text>
            <Text style={styles.resultBody}>
              Please enable microphone permissions for Meowchi in your device settings to
              record your cat's sounds.
            </Text>
            <PawButton onPress={reset} style={styles.stretch}>
              Okay
            </PawButton>
          </KawaiiCard>
        )}

        {(stage === 'idle' || stage === 'recording' || stage === 'analyzing') && (
          <View style={styles.recordArea}>
            <Animated.View style={{ transform: [{ scale: pulse }] }}>
              <Pressable
                onPress={stage === 'recording' ? stopRecording : startRecording}
                disabled={stage === 'analyzing'}
                style={[
                  styles.micButton,
                  stage === 'recording' && styles.micButtonActive,
                  Shadow.soft,
                ]}>
                <Ionicons
                  name={stage === 'recording' ? 'stop' : 'mic'}
                  size={48}
                  color={Theme.textOnPrimary}
                />
              </Pressable>
            </Animated.View>

            {stage === 'recording' && <PixelBars active />}
            {stage === 'analyzing' && <PixelPawTrail />}

            <Text style={styles.hint}>
              {stage === 'idle' && 'Tap to start recording'}
              {stage === 'recording' && `Listening… ${(elapsedMs / 1000).toFixed(1)}s`}
              {stage === 'analyzing' && 'Reading the meow-tion data…'}
            </Text>
          </View>
        )}

        {stage === 'result' && mood && (
          <KawaiiCard style={styles.centerCard}>
            <PixelIcon name={mood.icon} size={56} />
            <Text style={styles.resultLabel}>{mood.label}</Text>
            <Text style={styles.translation}>{mood.translation}</Text>
            <Text style={styles.resultBody}>{mood.advice}</Text>
            <View style={styles.confidencePill}>
              <Text style={styles.confidenceText}>{mood.confidence}% purr-suasive match</Text>
            </View>

            <View style={styles.resultActions}>
              {recordingUri && (
                <PawButton variant="ghost" onPress={playRecording} style={styles.flexButton}>
                  ▶ Play back
                </PawButton>
              )}
              <PawButton onPress={reset} style={styles.flexButton}>
                Record again
              </PawButton>
            </View>
          </KawaiiCard>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
    flexGrow: 1,
  },
  recordArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.lg,
  },
  micButton: {
    width: 140,
    height: 140,
    borderRadius: Radii.pill,
    backgroundColor: Theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: Theme.primaryDark,
  },
  hint: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Theme.textSecondary,
  },
  centerCard: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  resultLabel: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Theme.textPrimary,
    marginTop: Spacing.xs,
  },
  translation: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Theme.primaryDark,
    textAlign: 'center',
  },
  resultBody: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Theme.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  confidencePill: {
    backgroundColor: Theme.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    marginTop: Spacing.sm,
  },
  confidenceText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Theme.primaryDark,
  },
  resultActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    alignSelf: 'stretch',
  },
  flexButton: {
    flex: 1,
  },
  stretch: {
    alignSelf: 'stretch',
    marginTop: Spacing.sm,
  },
});
