import { PropsWithChildren } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';

import { Radii, Shadow, Spacing, Theme } from '@/constants/theme';

export function CenterModal({
  visible,
  onClose,
  children,
}: PropsWithChildren<{ visible: boolean; onClose: () => void }>) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(74, 46, 58, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Theme.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    ...Shadow.soft,
  },
});
