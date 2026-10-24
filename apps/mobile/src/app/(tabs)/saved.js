// Saved tab: Home / Work / School shortcuts and favourite places, kept on this phone.
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import IconPencil from '@tabler/icons-react-native/IconPencil';
import IconPlus from '@tabler/icons-react-native/IconPlus';
import IconStar from '@tabler/icons-react-native/IconStar';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { openSaved } from '../../saved/openSaved';
import { SHORTCUT_ICONS } from '../../saved/shortcutIcons';
import { SHORTCUTS, useSavedPlaces } from '../../store/savedPlaces';
import { useTheme } from '../../theme/useTheme';
import { fonts, radius, space, type } from '../../theme/tokens';

function EditButton({ label, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={12} style={styles.edit}>
      <IconPencil size={20} strokeWidth={2} color={colors.ink} />
    </Pressable>
  );
}

export default function SavedTab() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const shortcuts = useSavedPlaces((state) => state.shortcuts);
  const favourites = useSavedPlaces((state) => state.favourites);
  const removeShortcut = useSavedPlaces((state) => state.removeShortcut);
  const removeFavourite = useSavedPlaces((state) => state.removeFavourite);

  const pick = (slot) => router.push({ pathname: '/pick-place', params: { slot } });

  const editShortcut = (slot) =>
    Alert.alert(t(`saved.slots.${slot}`), shortcuts[slot].name, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('saved.remove'), style: 'destructive', onPress: () => removeShortcut(slot) },
      { text: t('saved.change'), onPress: () => pick(slot) },
    ]);

  const editFavourite = (saved) =>
    Alert.alert(saved.name, null, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('saved.remove'), style: 'destructive', onPress: () => removeFavourite(saved.key) },
    ]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.surface }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[type.h1, styles.title, { color: colors.ink }]} accessibilityRole="header">
            {t('saved.title')}
          </Text>
          <Pressable
            onPress={() => pick('favourite')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.add, { backgroundColor: colors.primary }, pressed && { opacity: 0.7 }]}
          >
            <IconPlus size={20} strokeWidth={2.5} color={colors.onPrimary} />
            <Text style={[styles.addLabel, { color: colors.onPrimary }]}>{t('saved.add')}</Text>
          </Pressable>
        </View>

        <SectionHeader title={t('saved.shortcuts')} />
        {SHORTCUTS.map((slot) => {
          const saved = shortcuts[slot];
          return (
            <ListRow
              key={slot}
              Icon={SHORTCUT_ICONS[slot]}
              tile
              strong
              title={t(`saved.slots.${slot}`)}
              subtitle={saved ? [saved.name, saved.detail].filter(Boolean).join(' · ') : t('saved.tapToSet')}
              onPress={() => (saved ? openSaved(router, saved) : pick(slot))}
              trailing={saved && <EditButton label={t('saved.edit')} onPress={() => editShortcut(slot)} />}
            />
          );
        })}

        <SectionHeader title={t('saved.favourites')} />
        {favourites.map((saved) => (
          <ListRow
            key={saved.key}
            Icon={IconStar}
            tile
            tileColor={colors.hairline}
            strong
            title={saved.name}
            subtitle={saved.detail}
            onPress={() => openSaved(router, saved)}
            trailing={<EditButton label={t('saved.edit')} onPress={() => editFavourite(saved)} />}
          />
        ))}
        {favourites.length === 0 && (
          <Text style={[type.small, styles.empty, { color: colors.inkMuted }]}>{t('saved.noFavourites')}</Text>
        )}

        <View style={[styles.note, { backgroundColor: colors.hairline }]}>
          <Text style={[type.small, { color: colors.ink }]}>{t('saved.onThisPhone')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: space[8] },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingTop: space[6],
    paddingBottom: space[2],
  },
  title: { flexShrink: 1 },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    height: 44,
    paddingHorizontal: space[4],
    borderRadius: radius.pill,
  },
  addLabel: { fontFamily: fonts.bold, fontSize: 16 },
  edit: { padding: space[1] },
  empty: { paddingHorizontal: space[4], paddingVertical: space[3] },
  note: { margin: space[4], padding: space[4], borderRadius: radius.md },
});
