// Turn-by-turn navigation for the trip started in the route preview.
// Calm while driving (brand voice): short words, no exclamation marks.
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import IconArrowBackUp from '@tabler/icons-react-native/IconArrowBackUp';
import IconArrowUp from '@tabler/icons-react-native/IconArrowUp';
import IconArrowUpLeft from '@tabler/icons-react-native/IconArrowUpLeft';
import IconArrowUpRight from '@tabler/icons-react-native/IconArrowUpRight';
import IconCornerUpLeft from '@tabler/icons-react-native/IconCornerUpLeft';
import IconCornerUpRight from '@tabler/icons-react-native/IconCornerUpRight';
import IconCurrentLocation from '@tabler/icons-react-native/IconCurrentLocation';
import IconFlag from '@tabler/icons-react-native/IconFlag';
import IconPlus from '@tabler/icons-react-native/IconPlus';
import IconRotateClockwise from '@tabler/icons-react-native/IconRotateClockwise';
import IconThumbDown from '@tabler/icons-react-native/IconThumbDown';
import IconThumbUp from '@tabler/icons-react-native/IconThumbUp';
import { Button } from '../components/Button';
import { formatClock, formatDistance, formatDuration, timeAgo } from '../format';
import { distanceToTurn, instructionText } from '../navigation/instructions';
import { NavMap } from '../navigation/NavMap';
import { useNavigation } from '../navigation/useNavigation';
import { REPORT_BADGES } from '../reports';
import { useTrip } from '../store/trip';
import { useTheme } from '../theme/useTheme';
import { fonts, palette, radius, space, type } from '../theme/tokens';

const TURN_ICONS = {
  left: IconCornerUpLeft,
  sharp_left: IconCornerUpLeft,
  slight_left: IconArrowUpLeft,
  keep_left: IconArrowUpLeft,
  right: IconCornerUpRight,
  sharp_right: IconCornerUpRight,
  slight_right: IconArrowUpRight,
  keep_right: IconArrowUpRight,
  u_turn: IconArrowBackUp,
  roundabout: IconRotateClockwise,
  leave_roundabout: IconArrowUpRight,
  arrive: IconFlag,
};

// The faster-route offer waits this long, then the driver stays on their route
const OFFER_SECONDS = 10;
const BOTTOM_BAR = 92;

function TurnBanner({ step, inM, simulated }) {
  const { t } = useTranslation();
  const Icon = TURN_ICONS[step?.type] ?? IconArrowUp;
  return (
    <View style={[styles.turn, { backgroundColor: palette.tealGreen }]}>
      <Icon size={44} strokeWidth={2.5} color={palette.offWhite} />
      <View style={styles.turnText}>
        <Text style={styles.turnDistance}>{distanceToTurn(inM)}</Text>
        <Text style={styles.turnWords} numberOfLines={3}>
          {instructionText(step)}
        </Text>
        {simulated && <Text style={styles.simulated}>{t('nav.simulated')}</Text>}
      </View>
    </View>
  );
}

function ReportBanner({ report }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.reportBanner, { backgroundColor: colors.surfaceRaised }]} accessibilityLiveRegion="polite">
      <Image source={REPORT_BADGES[report.label]} style={styles.reportBadge} />
      <View style={styles.flex}>
        <Text style={[type.body, styles.bold, { color: colors.ink }]}>
          {t(`nav.ahead.${report.label}`, { distance: distanceToTurn(report.ahead_m) })}
        </Text>
        {report.created_at && (
          <Text style={[type.small, { color: colors.inkMuted }]}>
            {t('nav.reportedAgo', { ago: timeAgo(report.created_at) })}
          </Text>
        )}
      </View>
    </View>
  );
}

function BetterRouteOffer({ offer, onSwitch, onStay }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [left, setLeft] = useState(OFFER_SECONDS);
  useEffect(() => {
    if (left <= 0) {
      onStay();
      return undefined;
    }
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  const saves = Math.round(offer.saves_s / 60);
  const now = Date.now();
  return (
    <View style={[styles.offer, { backgroundColor: colors.surface }]}>
      <View style={styles.offerHead}>
        <Image source={REPORT_BADGES.jammed} style={styles.reportBadge} />
        <View style={styles.flex}>
          <Text style={[type.body, styles.bold, { color: colors.ink }]}>{t('nav.offer.title')}</Text>
          <Text style={[type.body, styles.bold, { color: colors.tealText }]}>{t('nav.offer.saves', { minutes: saves })}</Text>
        </View>
      </View>
      <View style={styles.offerButtons}>
        <Button label={t('nav.offer.switch')} onPress={onSwitch} style={styles.flex} />
        <Pressable
          onPress={onStay}
          accessibilityRole="button"
          style={({ pressed }) => [styles.stay, { backgroundColor: colors.hairline }, pressed && { opacity: 0.7 }]}
        >
          <Text style={[type.body, styles.bold, { color: colors.ink }]}>{t('nav.offer.stay')}</Text>
        </Pressable>
      </View>
      <View style={styles.offerFoot}>
        <Text style={[type.small, { color: colors.inkMuted }]}>
          {t('nav.offer.arriveInstead', {
            new: formatClock(now + offer.route.duration_s * 1000),
            old: formatClock(now + offer.current_s * 1000),
          })}
        </Text>
        <Text style={[type.small, { color: colors.inkMuted }]}>{t('nav.offer.stayingIn', { seconds: left })}</Text>
      </View>
    </View>
  );
}

function Arrived({ trip, onDone }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [answer, setAnswer] = useState(null);
  const [arrivedAt] = useState(() => new Date());
  const minutes = Math.max(1, Math.round((arrivedAt - trip.startedAt) / 60_000));

  const choice = (value, Icon, label) => (
    <Pressable
      onPress={() => setAnswer(value)}
      accessibilityRole="radio"
      accessibilityState={{ checked: answer === value }}
      style={[styles.choice, { backgroundColor: answer === value ? colors.selected : colors.hairline }]}
    >
      <Icon size={20} strokeWidth={2} color={colors.ink} />
      <Text style={[type.body, styles.bold, { color: colors.ink }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.arrived, { backgroundColor: colors.surface }]}>
      <Text style={[type.h1, { color: colors.ink }]} accessibilityRole="header">
        {t('nav.arrived.title')}
      </Text>
      <Text style={[type.body, { color: colors.inkMuted }]}>{trip.destination.name}</Text>
      <Text style={[type.body, styles.bold, { color: colors.tealText }]}>
        {t('nav.arrived.summary', { time: formatClock(arrivedAt), duration: formatDuration(minutes) })}
      </Text>

      <Text style={[type.body, styles.bold, { color: colors.ink, marginTop: space[3] }]}>{t('nav.arrived.routeOk')}</Text>
      <View style={styles.choices}>
        {choice('good', IconThumbUp, t('nav.arrived.yes'))}
        {choice('bad', IconThumbDown, t('nav.arrived.no'))}
      </View>
      {answer && <Text style={[type.small, { color: colors.inkMuted }]}>{t('nav.arrived.thanksAnswer')}</Text>}

      {trip.avoidedClosures > 0 && (
        <View style={[styles.thanks, { backgroundColor: colors.friendly }]}>
          <Text style={[type.small, { color: palette.charcoal }]}>
            <Text style={styles.bold}>{t('profile.thanksTitle')} </Text>
            {t('nav.arrived.avoided', { count: trip.avoidedClosures })}
          </Text>
        </View>
      )}

      <View style={styles.flex} />
      <Button label={t('nav.arrived.done')} onPress={onDone} />
    </View>
  );
}

export default function Navigate() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const endTrip = useTrip((state) => state.end);
  const nav = useNavigation();
  const map = useRef(null);
  const [following, setFollowing] = useState(true);
  const [arrived, setArrived] = useState(false);
  // Set when the driver ends the trip, so the no-trip check below doesn't also navigate
  const leaving = useRef(false);

  const finish = () => {
    leaving.current = true;
    router.dismissTo('/');
    endTrip();
  };

  useEffect(() => {
    if (nav.arrived) setArrived(true);
  }, [nav.arrived]);

  // Android back ends the trip, like End (otherwise it would keep running unseen)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      finish();
      return true;
    });
    return () => sub.remove();
  }, []);

  // No trip (e.g. the app was reloaded): nothing to navigate
  useEffect(() => {
    if (nav.trip || leaving.current) return;
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [nav.trip]);
  if (!nav.trip) return null;

  const bottomInset = insets.bottom + BOTTOM_BAR;

  return (
    <View style={styles.screen}>
      <NavMap
        ref={map}
        line={nav.line}
        progress={nav.progress}
        speed={nav.line.speed}
        following={following && !arrived}
        onUserMove={() => setFollowing(false)}
        bottomInset={bottomInset}
      />

      {!arrived && (
        <View style={[styles.top, { top: insets.top + space[2] }]} pointerEvents="box-none">
          <TurnBanner step={nav.step} inM={nav.step_in_m} simulated={nav.simulated} />
          {nav.rerouting && (
            <View style={[styles.reportBanner, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={[type.body, styles.bold, { color: colors.ink }]}>{t('nav.rerouting')}</Text>
            </View>
          )}
          {nav.report && !nav.rerouting && <ReportBanner report={nav.report} />}
        </View>
      )}

      {!arrived && !nav.offer && (
        <View style={[styles.side, { bottom: bottomInset + space[4] }]} pointerEvents="box-none">
          {!following && (
            <Pressable
              onPress={() => {
                setFollowing(true);
                map.current?.recentre();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('nav.recentre')}
              style={[styles.round, { backgroundColor: colors.surfaceRaised }]}
            >
              <IconCurrentLocation size={26} strokeWidth={2} color={colors.tealText} />
            </Pressable>
          )}
          <Pressable
            onPress={() => router.push({ pathname: '/report', params: { lng: nav.progress?.point[0], lat: nav.progress?.point[1] } })}
            accessibilityRole="button"
            style={[styles.reportButton, { backgroundColor: colors.primary }]}
          >
            <IconPlus size={26} strokeWidth={2.5} color={colors.onPrimary} />
            <Text style={[styles.reportLabel, { color: colors.onPrimary }]}>{t('map.report')}</Text>
          </Pressable>
        </View>
      )}

      {!arrived && !nav.offer && (
        <View style={[styles.bar, { backgroundColor: colors.surface, paddingBottom: insets.bottom + space[3] }]}>
          <View style={styles.flex}>
            <Text style={[styles.arrive, { color: colors.tealText }]}>
              {t('nav.arrive', { time: formatClock(nav.eta) })}
            </Text>
            <Text style={[type.small, { color: colors.inkMuted }]}>
              {`${formatDuration(nav.remaining_s / 60)} · ${formatDistance(nav.remaining_m)}`}
            </Text>
          </View>
          <Pressable
            onPress={finish}
            accessibilityRole="button"
            style={({ pressed }) => [styles.end, { backgroundColor: colors.hairline }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[type.body, styles.bold, { color: colors.ink }]}>{t('nav.end')}</Text>
          </Pressable>
        </View>
      )}

      {!arrived && nav.offer && (
        <View style={[styles.offerWrap, { paddingBottom: insets.bottom }]}>
          <BetterRouteOffer offer={nav.offer} onSwitch={nav.acceptOffer} onStay={nav.dismissOffer} />
        </View>
      )}

      {arrived && (
        <View style={[styles.arrivedWrap, { paddingBottom: insets.bottom + space[3] }]}>
          <Arrived trip={nav.trip} onDone={finish} />
        </View>
      )}
    </View>
  );
}

const shadow = { elevation: 6, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } };

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  bold: { fontFamily: fonts.bold },
  top: { position: 'absolute', left: space[3], right: space[3], gap: space[2] },
  turn: { ...shadow, flexDirection: 'row', alignItems: 'center', gap: space[4], padding: space[4], borderRadius: radius.lg },
  turnText: { flex: 1 },
  turnDistance: { fontFamily: fonts.extraBold, fontSize: 34, lineHeight: 40, color: palette.offWhite },
  turnWords: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: palette.offWhite },
  simulated: { fontFamily: fonts.medium, fontSize: 12, color: palette.lightMint, marginTop: space[1] },
  reportBanner: { ...shadow, flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], borderRadius: radius.md },
  reportBadge: { width: 40, height: 40 },
  side: { position: 'absolute', right: space[4], alignItems: 'flex-end', gap: space[3] },
  round: { ...shadow, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  reportButton: { ...shadow, width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  reportLabel: { fontFamily: fonts.bold, fontSize: 12 },
  bar: {
    ...shadow,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingTop: space[3],
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  arrive: { fontFamily: fonts.extraBold, fontSize: 24, lineHeight: 30 },
  end: { height: 48, paddingHorizontal: space[6], borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  offerWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  offer: { ...shadow, padding: space[4], gap: space[3], borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  offerHead: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  offerButtons: { flexDirection: 'row', gap: space[2] },
  stay: { flex: 1, minHeight: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  offerFoot: { flexDirection: 'row', justifyContent: 'space-between' },
  arrivedWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, top: '38%' },
  arrived: { ...shadow, flex: 1, padding: space[6], gap: space[1], borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  choices: { flexDirection: 'row', gap: space[2], marginTop: space[2] },
  choice: {
    flex: 1,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    borderRadius: radius.md,
  },
  thanks: { padding: space[4], borderRadius: radius.md, marginTop: space[3] },
});
