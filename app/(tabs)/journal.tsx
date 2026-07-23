import { Ionicons } from '@expo/vector-icons';
import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import { useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CenterModal } from '@/components/kawaii/CenterModal';
import { GradientBackground } from '@/components/kawaii/GradientBackground';
import { KawaiiCard } from '@/components/kawaii/KawaiiCard';
import { PawButton } from '@/components/kawaii/PawButton';
import { PixelIcon } from '@/components/kawaii/PixelIcon';
import { ScreenHeader } from '@/components/kawaii/ScreenHeader';
import { Fonts, Radii, Spacing, Theme } from '@/constants/theme';
import {
  createFolder,
  deleteFolder,
  deleteJournalEntry,
  JournalEntry,
  JournalFolder,
  loadFolders,
  loadJournal,
  updateJournalEntry,
} from '@/lib/journalStorage';

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function JournalScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [folders, setFolders] = useState<JournalFolder[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);

  const [noteEntryId, setNoteEntryId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const [folderEntryId, setFolderEntryId] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderDraft, setFolderDraft] = useState('');

  const [newFolderModalVisible, setNewFolderModalVisible] = useState(false);
  const [newFolderDraft, setNewFolderDraft] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadJournal().then(setEntries);
      loadFolders().then(setFolders);
      return () => {
        playerRef.current?.remove();
        setPlayingId(null);
        setIsPaused(false);
      };
    }, []),
  );

  function togglePlay(entry: JournalEntry) {
    if (!entry.recordingUri) return;

    if (playingId === entry.id) {
      if (isPaused) {
        playerRef.current?.play();
        setIsPaused(false);
      } else {
        playerRef.current?.pause();
        setIsPaused(true);
      }
      return;
    }

    playerRef.current?.remove();
    const player = createAudioPlayer(entry.recordingUri);
    playerRef.current = player;
    setPlayingId(entry.id);
    setIsPaused(false);
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        setPlayingId(null);
        setIsPaused(false);
        subscription.remove();
      }
    });
    player.play();
  }

  async function shareEntry(uri?: string) {
    if (!uri) return;
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert('Sharing unavailable', "Your device doesn't support sharing right now.");
      return;
    }
    await Sharing.shareAsync(uri);
  }

  async function removeEntry(id: string) {
    if (playingId === id) {
      playerRef.current?.remove();
      setPlayingId(null);
      setIsPaused(false);
    }
    const next = await deleteJournalEntry(id);
    setEntries(next);
  }

  function openNoteEditor(entry: JournalEntry) {
    setNoteEntryId(entry.id);
    setNoteDraft(entry.note ?? '');
  }

  async function saveNote() {
    if (!noteEntryId) return;
    const next = await updateJournalEntry(noteEntryId, { note: noteDraft.trim() || undefined });
    setEntries(next);
    setNoteEntryId(null);
  }

  function openFolderPicker(entry: JournalEntry) {
    setFolderEntryId(entry.id);
    setCreatingFolder(false);
    setFolderDraft('');
  }

  async function assignFolder(folderId: string | null) {
    if (!folderEntryId) return;
    const next = await updateJournalEntry(folderEntryId, { folderId });
    setEntries(next);
    setFolderEntryId(null);
  }

  async function createAndAssignFolder() {
    const name = folderDraft.trim();
    if (!name) return;
    const { folders: nextFolders, folder } = await createFolder(name);
    setFolders(nextFolders);
    await assignFolder(folder.id);
  }

  async function createTopLevelFolder() {
    const name = newFolderDraft.trim();
    if (!name) return;
    const { folders: nextFolders, folder } = await createFolder(name);
    setFolders(nextFolders);
    setActiveFilter(folder.id);
    setNewFolderDraft('');
    setNewFolderModalVisible(false);
  }

  function confirmDeleteFolder(folder: JournalFolder) {
    Alert.alert(
      `Delete "${folder.name}"?`,
      'Entries inside will move back to Unsorted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const next = await deleteFolder(folder.id);
            setFolders(next);
            if (activeFilter === folder.id) setActiveFilter('all');
            loadJournal().then(setEntries);
          },
        },
      ],
    );
  }

  const visibleEntries = entries.filter((e) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unsorted') return !e.folderId;
    return e.folderId === activeFilter;
  });

  const folderNameById = (id?: string | null) => folders.find((f) => f.id === id)?.name;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          icon="book"
          title="Meow Journal"
          subtitle="Every mood you've decoded, saved in one purr-fect timeline."
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          {[{ id: 'all', name: 'All' }, { id: 'unsorted', name: 'Unsorted' }, ...folders].map(
            (f) => {
              const active = activeFilter === f.id;
              const isCustom = f.id !== 'all' && f.id !== 'unsorted';
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setActiveFilter(f.id)}
                  onLongPress={() => isCustom && confirmDeleteFolder(f as JournalFolder)}
                  style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {f.name}
                  </Text>
                </Pressable>
              );
            },
          )}
          <Pressable
            onPress={() => setNewFolderModalVisible(true)}
            style={[styles.chip, styles.chipNew]}>
            <Ionicons name="add" size={14} color={Theme.primaryDark} />
            <Text style={styles.chipText}>New</Text>
          </Pressable>
        </ScrollView>

        {visibleEntries.length === 0 && (
          <KawaiiCard style={styles.emptyCard}>
            <Image
              source={require('@/assets/images/paw_pixel.png')}
              style={styles.emptyPaw}
              resizeMode="contain"
            />
            <Text style={styles.emptyText}>
              {entries.length === 0
                ? "No entries yet — head to Listen and record your cat's first meow!"
                : 'Nothing in this folder yet.'}
            </Text>
          </KawaiiCard>
        )}

        {visibleEntries.map((entry) => {
          const isThisPlaying = playingId === entry.id && !isPaused;
          const folderName = folderNameById(entry.folderId);
          return (
            <KawaiiCard key={entry.id} style={styles.entryCard}>
              <View style={styles.entryRow}>
                <PixelIcon name={entry.mood.icon} size={40} />
                <View style={styles.entryInfo}>
                  <Text style={styles.entryLabel}>{entry.mood.label}</Text>
                  <Text style={styles.entryTranslation}>{entry.mood.translation}</Text>
                  <Text style={styles.entryDate}>{formatDate(entry.createdAt)}</Text>
                </View>
                <View style={styles.entryActions}>
                  {entry.recordingUri && (
                    <Pressable onPress={() => togglePlay(entry)} style={styles.iconButton}>
                      <Ionicons
                        name={isThisPlaying ? 'pause' : 'play'}
                        size={18}
                        color={Theme.primaryDark}
                      />
                    </Pressable>
                  )}
                  {entry.recordingUri && (
                    <Pressable
                      onPress={() => shareEntry(entry.recordingUri)}
                      style={styles.iconButton}>
                      <Ionicons name="share-outline" size={18} color={Theme.primaryDark} />
                    </Pressable>
                  )}
                  <Pressable onPress={() => removeEntry(entry.id)} style={styles.iconButton}>
                    <Ionicons name="trash" size={18} color={Theme.textSecondary} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.tagRow}>
                <Pressable onPress={() => openNoteEditor(entry)} style={styles.tagPill}>
                  <Ionicons name="create-outline" size={13} color={Theme.primaryDark} />
                  <Text style={styles.tagPillText} numberOfLines={1}>
                    {entry.note ? entry.note : 'Add note'}
                  </Text>
                </Pressable>
                <Pressable onPress={() => openFolderPicker(entry)} style={styles.tagPill}>
                  <Ionicons name="folder-outline" size={13} color={Theme.primaryDark} />
                  <Text style={styles.tagPillText} numberOfLines={1}>
                    {folderName ?? 'Unsorted'}
                  </Text>
                </Pressable>
              </View>
            </KawaiiCard>
          );
        })}
      </ScrollView>

      <CenterModal visible={noteEntryId !== null} onClose={() => setNoteEntryId(null)}>
        <Text style={styles.modalTitle}>Add a note</Text>
        <TextInput
          value={noteDraft}
          onChangeText={setNoteDraft}
          placeholder="What was going on when they made this sound?"
          placeholderTextColor={Theme.textSecondary}
          multiline
          numberOfLines={4}
          style={styles.textArea}
        />
        <View style={styles.modalActions}>
          <PawButton variant="ghost" onPress={() => setNoteEntryId(null)} style={styles.flexButton}>
            Cancel
          </PawButton>
          <PawButton onPress={saveNote} style={styles.flexButton}>
            Save
          </PawButton>
        </View>
      </CenterModal>

      <CenterModal visible={folderEntryId !== null} onClose={() => setFolderEntryId(null)}>
        <Text style={styles.modalTitle}>Move to folder</Text>
        <ScrollView style={styles.folderList}>
          <Pressable onPress={() => assignFolder(null)} style={styles.folderRow}>
            <Ionicons name="folder-outline" size={16} color={Theme.textPrimary} />
            <Text style={styles.folderRowText}>Unsorted</Text>
          </Pressable>
          {folders.map((f) => (
            <Pressable key={f.id} onPress={() => assignFolder(f.id)} style={styles.folderRow}>
              <Ionicons name="folder-outline" size={16} color={Theme.textPrimary} />
              <Text style={styles.folderRowText}>{f.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {creatingFolder ? (
          <View style={styles.newFolderInline}>
            <TextInput
              value={folderDraft}
              onChangeText={setFolderDraft}
              placeholder="Folder name"
              placeholderTextColor={Theme.textSecondary}
              style={styles.textInput}
              autoFocus
            />
            <PawButton onPress={createAndAssignFolder} style={styles.flexButton}>
              Create
            </PawButton>
          </View>
        ) : (
          <Pressable onPress={() => setCreatingFolder(true)} style={styles.newFolderRow}>
            <Ionicons name="add-circle-outline" size={16} color={Theme.primaryDark} />
            <Text style={styles.newFolderRowText}>New folder</Text>
          </Pressable>
        )}
      </CenterModal>

      <CenterModal visible={newFolderModalVisible} onClose={() => setNewFolderModalVisible(false)}>
        <Text style={styles.modalTitle}>New folder</Text>
        <TextInput
          value={newFolderDraft}
          onChangeText={setNewFolderDraft}
          placeholder="e.g. Morning chats"
          placeholderTextColor={Theme.textSecondary}
          style={styles.textInput}
          autoFocus
        />
        <View style={styles.modalActions}>
          <PawButton
            variant="ghost"
            onPress={() => setNewFolderModalVisible(false)}
            style={styles.flexButton}>
            Cancel
          </PawButton>
          <PawButton onPress={createTopLevelFolder} style={styles.flexButton}>
            Create
          </PawButton>
        </View>
      </CenterModal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  filterRow: {
    gap: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    backgroundColor: Theme.surfaceAlt,
  },
  chipActive: {
    backgroundColor: Theme.primary,
  },
  chipNew: {
    borderWidth: 1,
    borderColor: Theme.primaryLight,
    backgroundColor: 'transparent',
  },
  chipText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Theme.primaryDark,
  },
  chipTextActive: {
    color: Theme.textOnPrimary,
  },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  emptyPaw: {
    width: 48,
    height: 48,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Theme.textSecondary,
    textAlign: 'center',
  },
  entryCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  entryInfo: {
    flex: 1,
  },
  entryLabel: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Theme.textPrimary,
  },
  entryTranslation: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Theme.primaryDark,
  },
  entryDate: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Theme.textSecondary,
    marginTop: 2,
  },
  entryActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    backgroundColor: Theme.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radii.pill,
    backgroundColor: Theme.surfaceAlt,
    flexShrink: 1,
  },
  tagPillText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Theme.primaryDark,
    flexShrink: 1,
  },
  modalTitle: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    color: Theme.textPrimary,
    marginBottom: Spacing.sm,
  },
  textArea: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Theme.textPrimary,
    backgroundColor: Theme.surfaceAlt,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  textInput: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Theme.textPrimary,
    backgroundColor: Theme.surfaceAlt,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  flexButton: {
    flex: 1,
  },
  folderList: {
    maxHeight: 220,
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  folderRowText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Theme.textPrimary,
  },
  newFolderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  newFolderRowText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Theme.primaryDark,
  },
  newFolderInline: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
});
