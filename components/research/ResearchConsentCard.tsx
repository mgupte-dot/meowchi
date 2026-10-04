import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { CenterModal } from '@/components/kawaii/CenterModal';
import { KawaiiCard } from '@/components/kawaii/KawaiiCard';
import { PawButton } from '@/components/kawaii/PawButton';
import { PixelIcon } from '@/components/kawaii/PixelIcon';
import { Fonts, Spacing, Theme } from '@/constants/theme';
import { isBackendConfigured } from '@/lib/research/config';
import { ConsentRecord, grantConsent, loadConsent, revokeConsent } from '@/lib/research/consent';
import { enqueueErasure, enqueueIfConsented, flushQueue } from '@/lib/research/uploadQueue';

const SHARED = [
  'Meows you record, and the mood guess for each',
  'Which Call Kitty sounds you play, and whether your cat came',
];

const NOT_SHARED = [
  'Your name, email, or any account details',
  'Your location, contacts, or photos',
  'Your journal notes and folder names — those never leave this phone',
];

export function ResearchConsentCard() {
  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadConsent().then(setConsent);
    }, []),
  );

  if (!isBackendConfigured()) return null;

  async function optIn() {
    const record = await grantConsent();
    setConsent(record);
    setModalOpen(false);
    await enqueueIfConsented('participant', record.participantId);
    flushQueue();
  }

  async function optOut() {
    if (consent) {
      await enqueueErasure(consent.participantId);
    }
    await revokeConsent();
    setConsent(null);
    flushQueue();
  }

  return (
    <>
      <KawaiiCard style={styles.card}>
        <View style={styles.header}>
          <PixelIcon name="bulb" size={22} />
          <Text style={styles.title}>Help the research</Text>
        </View>
        <Text style={styles.body}>
          {consent
            ? 'You’re contributing anonymised meows and call results to Meowchi’s research on what cats respond to. Thank you!'
            : 'Meowchi is studying which sounds cats actually respond to. You can share your recordings anonymously to help.'}
        </Text>
        {consent ? (
          <PawButton variant="ghost" onPress={optOut} style={styles.button}>
            Stop sharing
          </PawButton>
        ) : (
          <PawButton variant="secondary" onPress={() => setModalOpen(true)} style={styles.button}>
            Learn more
          </PawButton>
        )}
      </KawaiiCard>

      <CenterModal visible={modalOpen} onClose={() => setModalOpen(false)}>
        <Text style={styles.modalTitle}>Share with research</Text>
        <Text style={styles.modalBody}>
          Meowchi is building real data on which sounds cats respond to. Sharing is optional, and
          the app works exactly the same if you say no.
        </Text>

        <Text style={styles.listHeading}>What gets shared</Text>
        {SHARED.map((line) => (
          <Text key={line} style={styles.listItem}>
            • {line}
          </Text>
        ))}

        <Text style={styles.listHeading}>What never gets shared</Text>
        {NOT_SHARED.map((line) => (
          <Text key={line} style={styles.listItem}>
            • {line}
          </Text>
        ))}

        <Text style={styles.modalFootnote}>
          Your data is labelled with a random ID, not anything that identifies you. Only meows
          recorded after you opt in are shared. You can stop any time, which also deletes what was
          already uploaded.
        </Text>

        <PawButton onPress={optIn} style={styles.modalButton}>
          Share my meows
        </PawButton>
        <PawButton variant="ghost" onPress={() => setModalOpen(false)}>
          Not now
        </PawButton>
      </CenterModal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.surfaceAlt,
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
  body: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Theme.textSecondary,
    lineHeight: 19,
    marginTop: 2,
  },
  button: {
    alignSelf: 'stretch',
    marginTop: Spacing.sm,
  },
  modalTitle: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: Theme.textPrimary,
    textAlign: 'center',
  },
  modalBody: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Theme.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  listHeading: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Theme.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  listItem: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Theme.textSecondary,
    lineHeight: 19,
  },
  modalFootnote: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Theme.textSecondary,
    lineHeight: 18,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  modalButton: {
    alignSelf: 'stretch',
    marginBottom: Spacing.sm,
  },
});
