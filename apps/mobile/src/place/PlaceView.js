// The place page, the same for every place: ones in our database (full details)
// and spots from the map or saved pins (what we know, plus a note).
// Go, Leave by…, Save and Share are always there.
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import IconBookmark from '@tabler/icons-react-native/IconBookmark';
import IconBookmarkFilled from '@tabler/icons-react-native/IconBookmarkFilled';
import IconChevronLeft from '@tabler/icons-react-native/IconChevronLeft';
import IconCircleCheck from '@tabler/icons-react-native/IconCircleCheck';
import IconClock from '@tabler/icons-react-native/IconClock';
import IconInfoCircle from '@tabler/icons-react-native/IconInfoCircle';
import IconNavigation from '@tabler/icons-react-native/IconNavigation';
import IconShare from '@tabler/icons-react-native/IconShare';
import { Button } from '../components/Button';
import { categoryLabel, formatDate, formatDistance } from '../format';
import { planRoute } from '../route/planRoute';
import { useSavedPlaces } from '../store/savedPlaces';
import { useTheme } from '../theme/useTheme';
import { fonts, radius, space, type } from '../theme/tokens';
import { AddressCard } from './AddressCard';
import { BusyCard } from './BusyCard';
import { HoursCard } from './HoursCard';
import { PlaceMap } from './PlaceMap';
import { ReportsCard } from './ReportsCard';
import { StatusPill } from './StatusPill';

const MAP_HEIGHT = 220;

/** Square action button under the header. */
function Action({ Icon, label, onPress, primary }) {
  const { colors } = useTheme();
  const tint = primary ? colors.onPrimary : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: primary ? colors.primary : colors.selected },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Icon size={22} strokeWidth={2} color={tint} />
      <Text style={[styles.actionLabel, { color: tint }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function BackButton() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      style={[styles.back, { top: insets.top + space[2], backgroundColor: colors.surfaceRaised }]}
    >
      <IconChevronLeft size={24} strokeWidth={2} color={colors.ink} />
    </Pressable>
  );
}

/** Shown while a place loads, or when it can't be loaded. */
export function PlaceLoading({ error, onRetry, retrying }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.centered, { backgroundColor: colors.surface }]}>
      {error ? (
        <>
          <Text style={[type.body, styles.message, { color: colors.ink }]}>
            {error.status === 404 ? t('place.notFound') : t('map.offline')}
          </Text>
          {error.status !== 404 && <Button label={t('common.tryAgain')} onPress={onRetry} disabled={retrying} />}
        </>
      ) : (
        <ActivityIndicator color={colors.tealText} />
      )}
      <BackButton />
    </View>
  );
}

/**
 * place: the API's place details shape. Spots not in the database fill in what
 * they know and leave the rest empty (hours null, no aliases...).
 * saved: the entry Save adds to favourites. notice: a note under the actions.
 */
export function PlaceView({ place, saved, notice }) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [scrolledPastMap, setScrolledPastMap] = useState(false);
  const isFavourite = useSavedPlaces((state) => state.favourites.some((f) => f.key === saved.key));
  const addFavourite = useSavedPlaces((state) => state.addFavourite);
  const removeFavourite = useSavedPlaces((state) => state.removeFavourite);

  const otherName = i18n.language === 'en' ? place.name_ms : place.name_en;
  const meta = [categoryLabel(place.category), formatDistance(place.distance_m)].filter(Boolean).join(' · ');

  // Go: route preview; Leave by…: the same, starting with the arrival time picker
  const goTo = (mode) => planRoute(router, { ...place.location, name: place.name }, mode);

  const share = () => {
    const { lat, lng } = place.location;
    Share.share({
      message: [place.name, place.address, `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`]
        .filter(Boolean)
        .join('\n'),
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + space[6] }}
        onScroll={(event) => setScrolledPastMap(event.nativeEvent.contentOffset.y > MAP_HEIGHT - insets.top)}
        scrollEventThrottle={32}
      >
        <PlaceMap location={place.location} style={{ height: MAP_HEIGHT }} />

        <View style={[styles.header, { backgroundColor: colors.surfaceRaised }]}>
          <Text style={[type.h2, { color: colors.ink }]} accessibilityRole="header">
            {place.name}
          </Text>
          {otherName && otherName !== place.name ? (
            <Text style={[type.body, { color: colors.inkMuted }]}>{otherName}</Text>
          ) : null}
          {meta ? <Text style={[type.small, { color: colors.inkMuted, marginTop: space[2] }]}>{meta}</Text> : null}

          <View style={{ marginTop: space[3] }}>
            <StatusPill status={place.status} />
          </View>

          <View style={styles.actions}>
            <Action Icon={IconNavigation} label={t('place.go')} primary onPress={() => goTo()} />
            <Action Icon={IconClock} label={t('place.leaveBy')} onPress={() => goTo('leave_by')} />
            <Action
              Icon={isFavourite ? IconBookmarkFilled : IconBookmark}
              label={isFavourite ? t('place.saved') : t('place.save')}
              onPress={() => (isFavourite ? removeFavourite(saved.key) : addFavourite(saved))}
            />
            <Action Icon={IconShare} label={t('place.share')} onPress={share} />
          </View>

          {notice ? (
            <View style={[styles.notice, { backgroundColor: colors.hairline }]}>
              <IconInfoCircle size={18} strokeWidth={2} color={colors.inkMuted} />
              <Text style={[type.small, styles.noticeText, { color: colors.ink }]}>{notice}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cards}>
          <HoursCard hours={place.hours} />
          <BusyCard peakSpots={place.busy_times} fridayClosure={place.friday_prayer_closure} />
          <ReportsCard reports={place.nearby_reports} />
          <AddressCard address={place.address} aliases={place.also_known_as} />
          {place.last_verified_at && (
            <View style={styles.verified}>
              <IconCircleCheck size={18} strokeWidth={2} color={colors.inkMuted} />
              <Text style={[type.small, { color: colors.inkMuted }]}>
                {t('place.lastVerified', { date: formatDate(place.last_verified_at) })}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      {/* Keeps text from scrolling under the status bar once the map is gone */}
      {scrolledPastMap && (
        <View style={[styles.statusBar, { height: insets.top, backgroundColor: colors.surfaceRaised }]} />
      )}
      <BackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6], gap: space[4] },
  message: { textAlign: 'center' },
  statusBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  back: {
    position: 'absolute',
    left: space[4],
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  // Rounded sheet that overlaps the bottom of the map
  header: {
    marginTop: -radius.lg,
    padding: space[4],
    paddingTop: space[6],
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  actions: { flexDirection: 'row', gap: space[2], marginTop: space[3] },
  action: {
    flex: 1,
    height: 68,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1],
    paddingHorizontal: space[1],
  },
  actionLabel: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  notice: { flexDirection: 'row', gap: space[2], padding: space[3], borderRadius: radius.md, marginTop: space[3] },
  noticeText: { flex: 1 },
  cards: { padding: space[4], gap: space[4] },
  verified: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
