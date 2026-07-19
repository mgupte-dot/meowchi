import { Audio } from 'expo-av';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GradientBackground } from '@/components/kawaii/GradientBackground';
import { KawaiiCard } from '@/components/kawaii/KawaiiCard';
import { PixelBars } from '@/components/kawaii/PixelBars';
import { PixelIcon } from '@/components/kawaii/PixelIcon';
import { ScreenHeader } from '@/components/kawaii/ScreenHeader';
import { Fonts, Radii, Shadow, Spacing, Theme } from '@/constants/theme';
import { SOUND_PRESETS } from '@/lib/callSounds';

export default function CallKittyScreen() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  async function playPreset(id: string) {
    const preset = SOUND_PRESETS.find((p) => p.id === id);
    if (!preset) return;

    await soundRef.current?.unloadAsync().catch(() => {});
    setPlayingId(id);

    const { sound } = await Audio.Sound.createAsync(preset.source);
    soundRef.current = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        setPlayingId((current) => (current === id ? null : current));
      }
    });
    await sound.playAsync();
  }

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          catRoll
          title="Call Kitty"
          subtitle="Play a sound to bring your cat closer — best with the volume up and phone nearby."
        />

        <View style={styles.grid}>
          {SOUND_PRESETS.map((preset) => {
            const isPlaying = playingId === preset.id;
            return (
              <Pressable
                key={preset.id}
                onPress={() => playPreset(preset.id)}
                style={({ pressed }) => [pressed && styles.pressed]}>
                <KawaiiCard
                  style={StyleSheet.flatten([
                    styles.soundCard,
                    isPlaying && styles.soundCardActive,
                  ])}>
                  <PixelIcon name={preset.icon} size={44} />
                  <Text style={styles.soundLabel}>{preset.label}</Text>
                  <Text style={styles.soundDescription}>{preset.description}</Text>
                  {isPlaying ? (
                    <View style={styles.playingRow}>
                      <PixelBars active barWidth={4} color={Theme.primaryDark} />
                    </View>
                  ) : (
                    <View style={styles.playBadge}>
                      <Text style={styles.playBadgeText}>▶ Play</Text>
                    </View>
                  )}
                </KawaiiCard>
              </Pressable>
            );
          })}
        </View>

        <KawaiiCard style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <PixelIcon name="bulb" size={22} />
            <Text style={styles.tipTitle}>Tip</Text>
          </View>
          <Text style={styles.tipBody}>
            These are real recorded cat sounds, so reactions vary by cat. Try "Come Here!" or
            "Sweet Greeting" to grab attention, then switch to "Cuddle Time" once they're near.
          </Text>
        </KawaiiCard>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  grid: {
    gap: Spacing.md,
  },
  soundCard: {
    alignItems: 'center',
    gap: 2,
  },
  soundCardActive: {
    borderColor: Theme.primary,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.85,
  },
  soundLabel: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    color: Theme.textPrimary,
    marginTop: 4,
  },
  soundDescription: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Theme.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  playBadge: {
    backgroundColor: Theme.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    marginTop: 4,
  },
  playingRow: {
    marginTop: 6,
    height: 26,
  },
  playBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Theme.primaryDark,
  },
  tipCard: {
    backgroundColor: Theme.surfaceAlt,
    ...Shadow.soft,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tipTitle: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Theme.textPrimary,
  },
  tipBody: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Theme.textSecondary,
    lineHeight: 19,
  },
});
