// Map tab: Brunei base map with Peak Spots, live reports and the driver's position.
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { Camera, GeoJSONSource, Layer, Map, NativeUserLocation } from '@maplibre/maplibre-react-native';
import IconCircleCheck from '@tabler/icons-react-native/IconCircleCheck';
import IconCurrentLocation from '@tabler/icons-react-native/IconCurrentLocation';
import IconPlus from '@tabler/icons-react-native/IconPlus';
import IconSearch from '@tabler/icons-react-native/IconSearch';
import IconWifiOff from '@tabler/icons-react-native/IconWifiOff';
import { BRUNEI_BOUNDS, currentLngLat, inBrunei } from '../../location';
import { MapLayers } from '../../map/MapLayers';
import { DEFAULT_CENTER, mapStyle } from '../../map/style';
import { useMapLayers } from '../../map/useMapLayers';
import { SHORTCUT_ICONS } from '../../saved/shortcutIcons';
import { useFlash } from '../../store/flash';
import { SHORTCUTS, useSavedPlaces } from '../../store/savedPlaces';
import { useTheme } from '../../theme/useTheme';
import { fonts, radius, space, type } from '../../theme/tokens';

const STREET_ZOOM = 15;

export default function MapTab() {
  const router = useRouter();
  const { t } = useTranslation();
  const { scheme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const camera = useRef(null);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const { reports, peakSpots, error } = useMapLayers(center);
  const shortcuts = useSavedPlaces((state) => state.shortcuts);
  const [focus, setFocus] = useState(null);

  // One-off messages such as "Thanks for the report", shown for a few seconds
  const flash = useFlash((state) => state.message);
  const clearFlash = useFlash((state) => state.clear);
  useEffect(() => {
    if (!flash) return undefined;
    const timer = setTimeout(clearFlash, 4000);
    return () => clearTimeout(timer);
  }, [flash, clearFlash]);

  const showOnMap = (lngLat) => {
    setFocus(lngLat);
    camera.current?.flyTo({ center: lngLat, zoom: STREET_ZOOM, duration: 800 });
  };

  // Opened from Saved with a pinned spot: /?lng=..&lat=..
  const params = useLocalSearchParams();
  useEffect(() => {
    if (params.lng && params.lat) showOnMap([Number(params.lng), Number(params.lat)]);
  }, [params.lng, params.lat, params.at]);

  // Once location is allowed, open on the driver (only when they are in Brunei)
  useEffect(() => {
    if (!permission?.granted) return;
    currentLngLat()
      .then((lngLat) => {
        if (inBrunei(lngLat)) camera.current?.jumpTo({ center: lngLat, zoom: STREET_ZOOM });
      })
      .catch(() => {});
  }, [permission?.granted]);

  const onLocate = async () => {
    let granted = permission?.granted;
    if (!granted) {
      if (permission && !permission.canAskAgain) return Linking.openSettings();
      granted = (await requestPermission()).granted;
    }
    if (!granted) return;
    const lngLat = await currentLngLat().catch(() => null);
    if (!lngLat) return;
    camera.current?.flyTo({ center: inBrunei(lngLat) ? lngLat : DEFAULT_CENTER, zoom: STREET_ZOOM, duration: 800 });
  };

  const raised = { backgroundColor: colors.surfaceRaised, shadowColor: '#000' };

  return (
    <View style={styles.screen}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={mapStyle(scheme)}
        logo={false}
        attributionPosition={{ top: insets.top + space[2], right: space[2] }}
        compassPosition={{ top: insets.top + space[12], right: space[3] }}
        onRegionDidChange={(event) => setCenter(event.nativeEvent.center)}
      >
        <Camera
          ref={camera}
          initialViewState={{ center: DEFAULT_CENTER, zoom: STREET_ZOOM }}
          minZoom={8}
          maxBounds={BRUNEI_BOUNDS}
        />
        <MapLayers
          reports={reports}
          peakSpots={peakSpots}
          scheme={scheme}
          onReportPress={(id) => router.push(`/reports/${id}`)}
        />
        {focus && (
          <GeoJSONSource
            id="focus"
            data={{ type: 'Feature', geometry: { type: 'Point', coordinates: focus }, properties: {} }}
          >
            <Layer
              id="focus-pin"
              type="circle"
              paint={{
                'circle-radius': 11,
                'circle-color': colors.primary,
                'circle-stroke-color': '#FFFFFF',
                'circle-stroke-width': 3,
              }}
            />
          </GeoJSONSource>
        )}
        {permission?.granted && <NativeUserLocation />}
      </Map>

      {flash ? (
        <View style={[styles.notice, raised, { top: insets.top + space[2] }]} accessibilityLiveRegion="polite">
          <IconCircleCheck size={18} strokeWidth={2} color={colors.tealText} />
          <Text style={[type.small, styles.noticeText, { color: colors.ink }]}>{flash}</Text>
        </View>
      ) : (
        error && (
          <View style={[styles.notice, raised, { top: insets.top + space[2] }]}>
            <IconWifiOff size={18} strokeWidth={2} color={colors.inkMuted} />
            <Text style={[type.small, styles.noticeText, { color: colors.ink }]}>{t('map.offline')}</Text>
          </View>
        )
      )}

      <View style={styles.bottom} pointerEvents="box-none">
        <Pressable
          onPress={onLocate}
          accessibilityRole="button"
          accessibilityLabel={t('map.locate')}
          style={[styles.locate, raised]}
        >
          <IconCurrentLocation size={26} strokeWidth={2} color={colors.tealText} />
        </Pressable>

        {/* Saved shortcuts. Drive times ("Home · 9 min") come with routing. */}
        {SHORTCUTS.some((slot) => shortcuts[slot]) && (
          <View style={styles.chips}>
            {SHORTCUTS.filter((slot) => shortcuts[slot]).map((slot) => {
              const Icon = SHORTCUT_ICONS[slot];
              const { lng, lat } = shortcuts[slot].location;
              return (
                <Pressable
                  key={slot}
                  onPress={() => showOnMap([lng, lat])}
                  accessibilityRole="button"
                  style={[styles.chip, raised]}
                >
                  <Icon size={18} strokeWidth={2} color={colors.tealText} />
                  <Text style={[styles.chipLabel, { color: colors.ink }]}>{t(`saved.slots.${slot}`)}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.row}>
          <Pressable
            onPress={() => router.push('/search')}
            accessibilityRole="search"
            style={[styles.search, raised]}
          >
            <IconSearch size={24} strokeWidth={2} color={colors.tealText} />
            <Text style={[type.body, { color: colors.inkMuted }]} numberOfLines={1}>
              {t('map.searchPlaceholder')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/report', params: { lng: center[0], lat: center[1] } })}
            accessibilityRole="button"
            style={[styles.report, { backgroundColor: colors.primary, shadowColor: '#000' }]}
          >
            <IconPlus size={24} strokeWidth={2.5} color={colors.onPrimary} />
            <Text style={[styles.reportLabel, { color: colors.onPrimary }]}>{t('map.report')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const shadow = { shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 };

const styles = StyleSheet.create({
  screen: { flex: 1 },
  notice: {
    ...shadow,
    position: 'absolute',
    left: space[4],
    right: space[12],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    borderRadius: radius.md,
  },
  noticeText: { flex: 1 },
  bottom: { position: 'absolute', left: space[4], right: space[4], bottom: space[4], gap: space[3] },
  locate: {
    ...shadow,
    alignSelf: 'flex-end',
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: space[2] },
  chips: { flexDirection: 'row', gap: space[2] },
  chip: {
    ...shadow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    height: 40,
    paddingHorizontal: space[3],
    borderRadius: radius.pill,
  },
  chipLabel: { fontFamily: fonts.bold, fontSize: 15 },
  search: {
    ...shadow,
    flex: 1,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.md,
  },
  report: {
    ...shadow,
    width: 64,
    height: 64,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportLabel: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16 },
});
