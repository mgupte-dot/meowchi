import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GradientBackground } from '@/components/kawaii/GradientBackground';
import { KawaiiCard } from '@/components/kawaii/KawaiiCard';
import { PawButton } from '@/components/kawaii/PawButton';
import { PixelIcon } from '@/components/kawaii/PixelIcon';
import { ScreenHeader } from '@/components/kawaii/ScreenHeader';
import { Fonts, Spacing, Theme } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          mascot
          title="Meowchi"
          subtitle="Understand your cat's meows, and call them back to you."
        />

        <KawaiiCard style={styles.card}>
          <PixelIcon name="headphones" size={48} />
          <Text style={styles.cardTitle}>What are they saying?</Text>
          <Text style={styles.cardBody}>
            Record a meow, chirp, or yowl and get a cute translation of your cat's mood.
          </Text>
          <PawButton onPress={() => router.push('/listen')} style={styles.cardButton}>
            Start Listening
          </PawButton>
        </KawaiiCard>

        <KawaiiCard style={styles.card}>
          <PixelIcon name="bell" size={48} />
          <Text style={styles.cardTitle}>Call your kitty</Text>
          <Text style={styles.cardBody}>
            Play chirps, trills, and purrs to bring your cat close, get cuddly, or start playtime.
          </Text>
          <PawButton
            variant="secondary"
            onPress={() => router.push('/call')}
            style={styles.cardButton}>
            Call Kitty
          </PawButton>
        </KawaiiCard>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made with{' '}
            <Image source={require('@/assets/images/pixel/heart.png')} style={styles.footerHeart} />{' '}
            for cat parents everywhere
          </Text>
        </View>
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
  card: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  cardTitle: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: Theme.textPrimary,
    marginTop: 2,
  },
  cardBody: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Theme.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  cardButton: {
    alignSelf: 'stretch',
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  footerText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Theme.textSecondary,
  },
  footerHeart: {
    width: 14,
    height: 14,
  },
});
