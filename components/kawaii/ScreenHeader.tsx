import { StyleSheet, Text, View } from 'react-native';

import { PixelCatRoll } from '@/components/kawaii/PixelCatRoll';
import { PixelIcon, PixelIconName } from '@/components/kawaii/PixelIcon';
import { PixelMascot } from '@/components/kawaii/PixelMascot';
import { Fonts, Spacing, Theme } from '@/constants/theme';

export function ScreenHeader({
  icon,
  title,
  subtitle,
  mascot,
  catRoll,
}: {
  icon?: PixelIconName;
  title: string;
  subtitle?: string;
  mascot?: boolean;
  catRoll?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      {mascot ? (
        <View style={styles.mascotWrap}>
          <PixelMascot size={104} />
        </View>
      ) : catRoll ? (
        <View style={styles.mascotWrap}>
          <PixelCatRoll size={96} />
        </View>
      ) : icon ? (
        <PixelIcon name={icon} size={56} />
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  mascotWrap: {
    marginBottom: Spacing.xs,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Theme.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Theme.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: Spacing.md,
  },
});
