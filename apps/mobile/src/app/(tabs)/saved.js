// Saved tab: Home / Work / School shortcuts and favourite places, kept on this phone.
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import IconBellCheck from '@tabler/icons-react-native/IconBellCheck';
import IconNavigation from '@tabler/icons-react-native/IconNavigation';
import IconPencil from '@tabler/icons-react-native/IconPencil';
import IconPlus from '@tabler/icons-react-native/IconPlus';
import IconStar from '@tabler/icons-react-native/IconStar';
import IconX from '@tabler/icons-react-native/IconX';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { formatClock } from '../../format';
import { cancelReminder } from '../../notifications';
import { planRoute } from '../../route/planRoute';
import { openSaved } from '../../saved/openSaved';
import { SHORTCUT_ICONS } from '../../saved/shortcutIcons';
import { usePlannedTrips } from '../../store/plannedTrips';
import { SHORTCUTS, useSavedPlaces } from '../../store/savedPlaces';
import { useTheme } from '../../theme/useTheme';
import { fonts, radius, space, type } from '../../theme/tokens';

const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString();

/** Go (straight to the route preview) and edit, at the end of each saved place's row. */
function RowActions({ onGo, onEdit }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.rowActions}>
      <Pressable
        onPress={onGo}
        accessibilityRole="button"
        accessibilityLabel={t('place.go')}
        hitSlop={6}
        style={({ pressed }) => [styles.go, { backgroundColor: colors.primary }, pressed && { opacity: 0.7 }]}
      >
        <IconNavigation size={20} strokeWidth={2} color={colors.onPrimary} />
      </Pressable>
      <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={t('saved.edit')} hitSlop={12} style={styles.edit}>
        <IconPencil size={20} strokeWidth={2} color={colors.ink} />
      </Pressable>
    </View>
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

  const upcoming = usePlannedTrips((state) => state.trips).filter((trip) => new Date(trip.arriveBy) > new Date());
  const removePlanned = usePlannedTrips((state) => state.remove);

  const pick = (slot) => router.push({ pathname: '/pick-place', params: { slot } });

  const goTo = (saved, mode) => planRoute(router, { ...saved.location, name: saved.name }, mode);
  const leaveBy = (saved) => ({ text: t('place.leaveBy'), onPress: () => goTo(saved, 'leave_by') });

  // Android shows at most 3 buttons, so these close by tapping outside instead of Cancel
  const editShortcut = (slot) =>
    Alert.alert(
      t(`saved.slots.${slot}`),
      shortcuts[slot].name,
      [
        leaveBy(shortcuts[slot]),
        { text: t('saved.change'), onPress: () => pick(slot) },
        { text: t('saved.remove'), style: 'destructive', onPress: () => removeShortcut(slot) },
      ],
      { cancelable: true },
    );

  const editFavourite = (saved) =>
    Alert.alert(
      saved.name,
      null,
      [leaveBy(saved), { text: t('saved.remove'), style: 'destructive', onPress: () => removeFavourite(saved.key) }],
      { cancelable: true },
    );

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

        {upcoming.length > 0 && (
          <>
            <SectionHeader title={t('saved.upcoming')} />
            {upcoming.map((trip) => (
              <ListRow
                key={trip.id}
                Icon={IconBellCheck}
                tile
                strong
                title={trip.destination.name}
                subtitle={t('saved.upcomingDetail', {
                  leaveBy: formatClock(trip.leaveBy),
                  arriveBy: formatClock(trip.arriveBy),
                  day: isToday(trip.arriveBy) ? t('saved.today') : t('route.tomorrow'),
                })}
                onPress={() =>
                  router.push({
                    pathname: '/route',
                    params: {
                      to_lat: trip.destination.lat,
                      to_lng: trip.destination.lng,
                      to_name: trip.destination.name,
                      arrive_by: trip.arriveBy,
                    },
                  })
                }
                trailing={
                  <Pressable
                    onPress={() => {
                      cancelReminder(trip.reminderId);
                      removePlanned(trip.id);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('saved.cancelReminder')}
                    hitSlop={12}
                    style={styles.edit}
                  >
                    <IconX size={20} strokeWidth={2} color={colors.inkMuted} />
                  </Pressable>
                }
              />
            ))}
          </>
        )}

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
              trailing={saved && <RowActions onGo={() => goTo(saved)} onEdit={() => editShortcut(slot)} />}
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
            trailing={<RowActions onGo={() => goTo(saved)} onEdit={() => editFavourite(saved)} />}
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
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  go: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  edit: { padding: space[1] },
  empty: { paddingHorizontal: space[4], paddingVertical: space[3] },
  note: { margin: space[4], padding: space[4], borderRadius: radius.md },
});
