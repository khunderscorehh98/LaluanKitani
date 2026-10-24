// Weekly opening hours. Days with the same hours are grouped ("Mon – Thu");
// today always gets its own, bold row.
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/Card';
import { clock } from '../format';
import { useTheme } from '../theme/useTheme';
import { fonts, space, type } from '../theme/tokens';

// API days: 0 = Sunday. Bruneians read the week Monday first.
const WEEK = [1, 2, 3, 4, 5, 6, 0];

function groupDays(hours, today, closedLabel) {
  const byDay = Object.fromEntries(hours.map(({ day, windows }) => [day, windows]));
  const text = (day) =>
    byDay[day]?.length
      ? byDay[day].map((w) => `${clock(w.opens)} – ${clock(w.closes)}`).join(', ')
      : closedLabel;

  const rows = [];
  for (const day of WEEK) {
    const last = rows.at(-1);
    if (last && last.text === text(day) && day !== today && !last.days.includes(today)) {
      last.days.push(day);
    } else {
      rows.push({ days: [day], text: text(day) });
    }
  }
  return rows;
}

export function HoursCard({ hours }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const today = new Date().getDay();
  const names = t('days.long', { returnObjects: true });
  const short = t('days.short', { returnObjects: true });

  // The API sends null when no hours are recorded (most imported places): never guess
  if (!hours?.some((day) => day.windows.length)) {
    return (
      <Card title={t('place.hours')}>
        <Text style={[type.body, { color: colors.inkMuted }]}>{t('place.status.hoursNotConfirmed')}</Text>
      </Card>
    );
  }

  return (
    <Card title={t('place.hours')}>
      {groupDays(hours, today, t('place.closedAllDay')).map(({ days, text }) => {
        const isToday = days.includes(today);
        const label =
          days.length > 1
            ? `${short[days[0]]} – ${short[days.at(-1)]}`
            : isToday
              ? `${names[days[0]]} · ${t('place.today')}`
              : names[days[0]];
        const weight = isToday ? { fontFamily: fonts.bold } : null;
        return (
          <View key={days.join()} style={styles.row}>
            <Text style={[type.small, styles.day, weight, { color: colors.ink }]}>{label}</Text>
            <Text style={[type.small, styles.times, weight, { color: colors.ink }]}>{text}</Text>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space[3], paddingVertical: 3 },
  day: { width: 120 },
  times: { flex: 1 },
});
