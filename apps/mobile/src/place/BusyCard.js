// Busy times today: Peak Spot windows on the way here and the Friday prayer
// closure, drawn on a 6:00-23:00 timeline. Only real windows are shown; we
// have no hour-by-hour crowd data, so nothing is estimated.
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/Card';
import { clock, minutesOf } from '../format';
import { PEAK_SPOT_BADGE } from '../reports';
import { useTheme } from '../theme/useTheme';
import { fonts, radius, reportColors, space, type } from '../theme/tokens';

const START = 6 * 60;
const END = 23 * 60;
const TICKS = ['07:00', '12:00', '17:00', '22:00'];
const FRIDAY = 5;
const PRAYERS = { starts: '12:00', ends: '14:00' };

const percent = (hhmm) => `${((Math.min(Math.max(minutesOf(hhmm), START), END) - START) / (END - START)) * 100}%`;
const span = ({ starts, ends }) => ({
  left: percent(starts),
  width: `${((Math.min(minutesOf(ends), END) - Math.max(minutesOf(starts), START)) / (END - START)) * 100}%`,
});

export function BusyCard({ peakSpots, fridayClosure }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const now = new Date();
  const today = now.getDay();
  const nowText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const spotsToday = peakSpots.filter((spot) => spot.days.includes(today));
  const prayersToday = fridayClosure && today === FRIDAY;
  if (!spotsToday.length && !prayersToday) return null;

  const windows = spotsToday.flatMap((spot) => spot.windows.map((w) => ({ ...w, name: spot.name })));
  const nowMinutes = minutesOf(nowText);

  return (
    <Card
      title={`${t('place.busyTimes')} · ${t('days.long', { returnObjects: true })[today]}`}
      subtitle={t('place.busyTimesNote')}
    >
      <View style={[styles.track, { backgroundColor: colors.selected }]}>
        {prayersToday && <View style={[styles.segment, span(PRAYERS), { backgroundColor: colors.inkMuted, opacity: 0.35 }]} />}
        {windows.map((w) => (
          <View key={`${w.name}${w.starts}`} style={[styles.segment, span(w), { backgroundColor: reportColors.jammed }]} />
        ))}
        {nowMinutes > START && nowMinutes < END && (
          <View style={[styles.now, { left: percent(nowText), backgroundColor: colors.ink }]} />
        )}
      </View>
      <View style={styles.ticks}>
        {TICKS.map((tick) => (
          <Text key={tick} style={[type.small, styles.tick, { left: percent(tick), color: colors.inkMuted }]}>
            {clock(tick)}
          </Text>
        ))}
      </View>

      <View style={styles.legend}>
        {windows.map((w) => (
          <View key={`${w.name}${w.starts}`} style={styles.legendRow}>
            <Image source={PEAK_SPOT_BADGE} style={styles.badge} />
            <Text style={[type.small, styles.legendText, { color: colors.ink }]}>
              {t('place.peakSpotWindow', { from: clock(w.starts), to: clock(w.ends), name: w.name })}
            </Text>
          </View>
        ))}
        {prayersToday && (
          <Text style={[type.small, { color: colors.inkMuted }]}>
            {t('place.nowPrayers', { now: clock(nowText), from: clock(PRAYERS.starts), to: clock(PRAYERS.ends) })}
          </Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  track: { height: 32, borderRadius: radius.sm, overflow: 'hidden' },
  segment: { position: 'absolute', top: 0, bottom: 0 },
  now: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1 },
  ticks: { height: 20, marginTop: space[1] },
  tick: { position: 'absolute', width: 48, marginLeft: -24, textAlign: 'center' },
  legend: { gap: space[2], marginTop: space[3] },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  badge: { width: 22, height: 22 },
  legendText: { flex: 1, fontFamily: fonts.bold },
});
