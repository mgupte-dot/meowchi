import { LinearGradient } from 'expo-linear-gradient';
import { PropsWithChildren } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';

import { Theme } from '@/constants/theme';

export function GradientBackground({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle }>) {
  return (
    <LinearGradient
      colors={Theme.backgroundGradient}
      style={[styles.fill, style]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
