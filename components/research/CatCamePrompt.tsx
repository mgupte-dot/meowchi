import { StyleSheet, Text, View } from 'react-native';

import { CenterModal } from '@/components/kawaii/CenterModal';
import { PawButton } from '@/components/kawaii/PawButton';
import { PixelIcon } from '@/components/kawaii/PixelIcon';
import { Fonts, Spacing, Theme } from '@/constants/theme';

export function CatCamePrompt({
  visible,
  soundLabel,
  onAnswer,
  onDismiss,
}: {
  visible: boolean;
  soundLabel: string;
  onAnswer: (cameToYou: boolean) => void;
  onDismiss: () => void;
}) {
  return (
    <CenterModal visible={visible} onClose={onDismiss}>
      <View style={styles.header}>
        <PixelIcon name="catface" size={40} />
        <Text style={styles.title}>Did your cat come?</Text>
      </View>
      <Text style={styles.body}>
        You played <Text style={styles.soundName}>{soundLabel}</Text>. Answering builds a record of
        which sounds actually work on your cat.
      </Text>
      <View style={styles.actions}>
        <PawButton style={styles.action} onPress={() => onAnswer(true)}>
          Yes
        </PawButton>
        <PawButton style={styles.action} variant="secondary" onPress={() => onAnswer(false)}>
          No
        </PawButton>
      </View>
      <PawButton variant="ghost" onPress={onDismiss}>
        Skip
      </PawButton>
    </CenterModal>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: Theme.textPrimary,
  },
  body: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  soundName: {
    fontFamily: Fonts.bodyBold,
    color: Theme.primaryDark,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  action: {
    flex: 1,
  },
});
