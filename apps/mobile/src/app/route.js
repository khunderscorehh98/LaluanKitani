// Route preview: route options from your location to a place, Arrive by /
// Leave by, then Start. Opened by Go (and Leave by…) on a place.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import IconChevronLeft from '@tabler/icons-react-native/IconChevronLeft';
import IconClock from '@tabler/icons-react-native/IconClock';
import IconNavigation from '@tabler/icons-react-native/IconNavigation';
import { ApiError } from '../api/client';
import { Button } from '../components/Button';
import { formatClock } from '../format';
import { useOrigin } from '../location';
import { DEFAULT_CENTER } from '../map/style';
import { RouteMap } from '../route/RouteMap';
import { RouteOption } from '../route/RouteOption';
import { TimePicker } from '../route/TimePicker';
import { useRoutes } from '../route/useRoutes';
import { useTrip } from '../store/trip';
import { useTheme } from '../theme/useTheme';
import { fonts, radius, space, type } from '../theme/tokens';

// How long to wait for a location fix before saying we don't have one
const LOCATE_TIMEOUT_MS = 6000;

/** The driver's position; in development builds, a Gadong stand-in when they're outside Brunei (e.g. an emulator). */
function useStart() {
  const { origin, located } = useOrigin();
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), LOCATE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);
  if (origin) return { from: origin, status: 'located' };
  if (!located) return { from: null, status: 'no_permission' };
  if (!waited) return { from: null, status: 'locating' };
  return __DEV__ ? { from: DEFAULT_CENTER, status: 'dev_stand_in' } : { from: null, status: 'not_in_brunei' };
}

export default function RoutePreview() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [, requestPermission] = Location.useForegroundPermissions();
  const to = [Number(params.to_lng), Number(params.to_lat)];
  const { from, status } = useStart();
  const [arriveBy, setArriveBy] = useState(null);
  const [picking, setPicking] = useState(params.mode === 'leave_by');
  const [selected, setSelected] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(360);
  const startTrip = useTrip((state) => state.start);

  const { data, error, isFetching } = useRoutes(from, to, arriveBy);
  const routes = data?.routes ?? [];
  const route = routes[Math.min(selected, routes.length - 1)];

  // A new arrival time plans new routes: start from the fastest again
  useEffect(() => setSelected(0), [arriveBy]);

  const fromText = {
    located: t('route.fromYou'),
    dev_stand_in: t('route.fromDevStandIn'),
  }[status];

  const errorText =
    error instanceof ApiError && error.code === 'no_route'
      ? t('route.noRoute')
      : error instanceof ApiError && error.code === 'routing_unavailable'
        ? t('route.unavailable')
        : error && t('map.offline');

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <RouteMap
        routes={routes}
        selected={selected}
        onSelect={setSelected}
        from={from}
        to={to}
        padding={{ top: insets.top + 110, right: 40, bottom: sheetHeight + 24, left: 40 }}
      />

      <View style={[styles.header, { top: insets.top + space[2], backgroundColor: colors.surfaceRaised }]}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.back')} hitSlop={12}>
          <IconChevronLeft size={24} strokeWidth={2} color={colors.ink} />
        </Pressable>
        <View style={styles.headerText}>
          {fromText ? (
            <Text style={[type.small, { color: colors.inkMuted }]} numberOfLines={1}>
              {fromText}
            </Text>
          ) : null}
          <Text style={[type.body, styles.destination, { color: colors.ink }]} numberOfLines={1}>
            {params.to_name}
          </Text>
        </View>
      </View>

      <View
        style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + space[3] }]}
        onLayout={(event) => setSheetHeight(event.nativeEvent.layout.height)}
      >
        <View style={[styles.handle, { backgroundColor: colors.hairline }]} />

        {status === 'no_permission' && (
          <View style={styles.message}>
            <Text style={[type.body, styles.center, { color: colors.ink }]}>{t('route.needLocation')}</Text>
            <Button label={t('onboarding.location.allow')} onPress={() => requestPermission()} />
          </View>
        )}
        {(status === 'locating' || (from && !data && isFetching)) && (
          <View style={styles.message}>
            <ActivityIndicator color={colors.tealText} />
            <Text style={[type.small, styles.center, { color: colors.inkMuted }]}>
              {status === 'locating' ? t('route.locating') : t('route.planning')}
            </Text>
          </View>
        )}
        {status === 'not_in_brunei' && (
          <Text style={[type.body, styles.message, styles.center, { color: colors.ink }]}>{t('route.notInBrunei')}</Text>
        )}
        {errorText && !data ? (
          <Text style={[type.body, styles.message, styles.center, { color: colors.ink }]}>{errorText}</Text>
        ) : null}

        {route && (
          <>
            {data.warnings.includes('closure_at_endpoint') && (
              <Text style={[type.small, styles.warning, { color: colors.ink, backgroundColor: colors.friendly }]}>
                {t('route.closureAtEndpoint')}
              </Text>
            )}
            <ScrollView style={styles.options} contentContainerStyle={styles.optionsContent}>
              {routes.map((option, index) => (
                <RouteOption
                  key={option.index}
                  route={option}
                  departAt={data.depart_at}
                  selected={option === route}
                  onPress={() => setSelected(index)}
                />
              ))}
            </ScrollView>

            <View style={styles.times}>
              <View style={styles.timeBlock}>
                <Text style={[type.caption, { color: colors.inkMuted }]}>{t('route.arriveBy').toUpperCase()}</Text>
                <Pressable
                  onPress={() => setPicking(true)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.timeField,
                    { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[type.body, styles.timeFieldText, { color: arriveBy ? colors.ink : colors.inkMuted }]}>
                    {arriveBy ? formatClock(arriveBy) : t('route.setTime')}
                  </Text>
                  <IconClock size={20} strokeWidth={2} color={colors.ink} />
                </Pressable>
              </View>
              <View style={[styles.timeBlock, styles.timeRight]}>
                <Text style={[type.caption, { color: colors.inkMuted }]}>
                  {(route.leave_by ? t('route.leaveBy') : t('route.arrive')).toUpperCase()}
                </Text>
                <Text style={[styles.bigTime, { color: colors.tealText }]}>
                  {formatClock(route.leave_by ?? route.eta)}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                startTrip({
                  route,
                  destination: { lat: to[1], lng: to[0], name: params.to_name },
                  avoidedClosures: data.avoided_closures,
                });
                router.replace('/navigate');
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.start, { backgroundColor: colors.primary }, pressed && { opacity: 0.8 }]}
            >
              <IconNavigation size={22} strokeWidth={2} color={colors.onPrimary} />
              <Text style={[styles.startText, { color: colors.onPrimary }]}>{t('route.start')}</Text>
            </Pressable>
          </>
        )}
      </View>

      <TimePicker
        visible={picking}
        value={arriveBy}
        onPick={(time) => {
          setArriveBy(time);
          setPicking(false);
        }}
        onClear={() => {
          setArriveBy(null);
          setPicking(false);
        }}
        onClose={() => setPicking(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    position: 'absolute',
    left: space[4],
    right: space[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radius.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  headerText: { flex: 1 },
  destination: { fontFamily: fonts.extraBold },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '62%',
    paddingHorizontal: space[4],
    paddingTop: space[2],
    gap: space[3],
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -3 },
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  message: { alignItems: 'center', gap: space[3], paddingVertical: space[4] },
  center: { textAlign: 'center' },
  warning: { padding: space[3], borderRadius: radius.md },
  options: { flexGrow: 0 },
  optionsContent: { gap: space[2] },
  times: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space[3] },
  timeBlock: { gap: space[1] },
  timeRight: { alignItems: 'flex-end' },
  timeField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    height: 44,
    paddingHorizontal: space[3],
    borderWidth: 1.5,
    borderRadius: radius.md,
  },
  timeFieldText: { fontFamily: fonts.bold },
  bigTime: { fontFamily: fonts.extraBold, fontSize: 30, lineHeight: 36 },
  start: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    borderRadius: radius.md,
  },
  startText: { fontFamily: fonts.bold, fontSize: 18 },
});
