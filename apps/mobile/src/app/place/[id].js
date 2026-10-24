// Place details: names, Friday prayer status, hours, busy times, nearby reports.
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import IconBookmark from '@tabler/icons-react-native/IconBookmark';
import IconBookmarkFilled from '@tabler/icons-react-native/IconBookmarkFilled';
import IconChevronLeft from '@tabler/icons-react-native/IconChevronLeft';
import IconCircleCheck from '@tabler/icons-react-native/IconCircleCheck';
import IconClock from '@tabler/icons-react-native/IconClock';
import IconNavigation from '@tabler/icons-react-native/IconNavigation';
import IconShare from '@tabler/icons-react-native/IconShare';
import { apiGet } from '../../api/client';
import { Button } from '../../components/Button';
import { categoryLabel, formatDate, formatDistance, placeSubtitle } from '../../format';
import { useOrigin } from '../../location';
import { AddressCard } from '../../place/AddressCard';
import { BusyCard } from '../../place/BusyCard';
import { HoursCard } from '../../place/HoursCard';
import { PlaceMap } from '../../place/PlaceMap';
import { ReportsCard } from '../../place/ReportsCard';
import { StatusPill } from '../../place/StatusPill';
import { savedFromPlace, useSavedPlaces } from '../../store/savedPlaces';
import { useTheme } from '../../theme/useTheme';
import { fonts, radius, space, type } from '../../theme/tokens';

const MAP_HEIGHT = 220;

function usePlace(id) {
  const { i18n } = useTranslation();
  const { origin } = useOrigin();
  const [lng, lat] = origin ?? [];
  return useQuery({
    queryKey: ['place', id, i18n.language, lng, lat],
    queryFn: ({ signal }) => apiGet(`/v1/places/${id}`, { lang: i18n.language, lat, lng }, { signal }),
    placeholderData: (previous) => previous,
  });
}

/** Square action button under the header. Disabled ones are features still to come. */
function Action({ Icon, label, onPress, primary, disabled }) {
  const { colors } = useTheme();
  const tint = primary ? colors.onPrimary : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: primary ? colors.primary : colors.selected },
        (pressed || disabled) && { opacity: disabled ? 0.45 : 0.7 },
      ]}
    >
      <Icon size={22} strokeWidth={2} color={tint} />
      <Text style={[styles.actionLabel, { color: tint }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function PlaceDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: place, error, refetch, isFetching } = usePlace(id);
  const [scrolledPastMap, setScrolledPastMap] = useState(false);
  const isFavourite = useSavedPlaces((state) => state.favourites.some((f) => f.placeId === id));
  const addFavourite = useSavedPlaces((state) => state.addFavourite);
  const removeFavourite = useSavedPlaces((state) => state.removeFavourite);

  const back = (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      style={[styles.back, { top: insets.top + space[2], backgroundColor: colors.surfaceRaised }]}
    >
      <IconChevronLeft size={24} strokeWidth={2} color={colors.ink} />
    </Pressable>
  );

  if (!place) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.surface }]}>
        {error ? (
          <>
            <Text style={[type.body, styles.message, { color: colors.ink }]}>
              {error.status === 404 ? t('place.notFound') : t('map.offline')}
            </Text>
            {error.status !== 404 && (
              <Button label={t('common.tryAgain')} onPress={() => refetch()} disabled={isFetching} />
            )}
          </>
        ) : (
          <ActivityIndicator color={colors.tealText} />
        )}
        {back}
      </View>
    );
  }

  const otherName = i18n.language === 'en' ? place.name_ms : place.name_en;
  const meta = [categoryLabel(place.category), formatDistance(place.distance_m)].filter(Boolean).join(' · ');

  const toggleFavourite = () => {
    const saved = savedFromPlace(place, placeSubtitle(place));
    if (isFavourite) removeFavourite(saved.key);
    else addFavourite(saved);
  };

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
            <Action Icon={IconNavigation} label={t('place.go')} primary disabled />
            <Action Icon={IconClock} label={t('place.leaveBy')} disabled />
            <Action
              Icon={isFavourite ? IconBookmarkFilled : IconBookmark}
              label={isFavourite ? t('place.saved') : t('place.save')}
              onPress={toggleFavourite}
            />
            <Action Icon={IconShare} label={t('place.share')} onPress={share} />
          </View>
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
      {back}
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
  cards: { padding: space[4], gap: space[4] },
  verified: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
