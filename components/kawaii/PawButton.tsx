import { PropsWithChildren } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

import { Fonts, Radii, Shadow, Theme } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost';

export function PawButton({
  children,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: PropsWithChildren<{
  onPress?: (e: GestureResponderEvent) => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
}>) {
  const palette = {
    primary: { bg: Theme.primary, fg: Theme.textOnPrimary },
    secondary: { bg: Theme.primaryLight, fg: Theme.primaryDark },
    ghost: { bg: 'transparent', fg: Theme.primaryDark },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant !== 'ghost' && Shadow.soft,
        variant === 'ghost' && styles.ghostBorder,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      <Text style={[styles.label, { color: palette.fg }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBorder: {
    borderWidth: 2,
    borderColor: Theme.primaryLight,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
  },
});
