import { StyleSheet, Text, View } from 'react-native';

import { KawaiiCard } from '@/components/kawaii/KawaiiCard';
import { PixelIcon } from '@/components/kawaii/PixelIcon';
import { Fonts, Radii, Shadow, Spacing, Theme } from '@/constants/theme';
import { SOUND_PRESETS } from '@/lib/callSounds';
import { CallResponse, summarizeBySound } from '@/lib/research/callResponses';

export function ResponseRateCard({ responses }: { responses: CallResponse[] }) {
  if (responses.length === 0) return null;

  const rates = summarizeBySound(responses).sort((a, b) => b.rate - a.rate);

  return (
    <KawaiiCard style={styles.card}>
      <View style={styles.header}>
        <PixelIcon name="book" size={22} />
        <Text style={styles.title}>What works for your cat</Text>
      </View>
      <Text style={styles.subtitle}>
        Based on {responses.length} answered {responses.length === 1 ? 'call' : 'calls'}.
      </Text>

      <View style={styles.rows}>
        {rates.map((rate) => {
          const preset = SOUND_PRESETS.find((p) => p.id === rate.soundId);
          return (
            <View key={rate.soundId} style={styles.row}>
              <Text style={styles.rowLabel} numberOfLines={1}>
                {preset?.label ?? rate.soundId}
              </Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.round(rate.rate * 100)}%` }]} />
              </View>
              <Text style={styles.rowValue}>
                {rate.came}/{rate.played}
              </Text>
            </View>
          );
        })}
      </View>
    </KawaiiCard>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.surface,
    ...Shadow.soft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Theme.textPrimary,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Theme.textSecondary,
    marginTop: 2,
  },
  rows: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowLabel: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Theme.textPrimary,
    width: 104,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: Radii.pill,
    backgroundColor: Theme.surfaceAlt,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: Radii.pill,
    backgroundColor: Theme.primary,
  },
  rowValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Theme.primaryDark,
    width: 36,
    textAlign: 'right',
  },
});
