import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { GradientBackground } from '@/components/kawaii/GradientBackground';
import { PawButton } from '@/components/kawaii/PawButton';
import { PixelIcon } from '@/components/kawaii/PixelIcon';
import { Fonts, Spacing, Theme } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <GradientBackground>
        <View style={styles.container}>
          <PixelIcon name="alert" size={64} />
          <Text style={styles.title}>This screen wandered off like a cat.</Text>
          <Link href="/" asChild>
            <PawButton>Back home</PawButton>
          </Link>
        </View>
      </GradientBackground>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    color: Theme.textPrimary,
    textAlign: 'center',
  },
});
