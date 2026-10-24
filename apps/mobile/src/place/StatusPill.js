// Open / closed line under the place name, including the Friday prayer closure.
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import IconClock from '@tabler/icons-react-native/IconClock';
import { clock } from '../format';
import { useTheme } from '../theme/useTheme';
import { fonts, radius, space, type } from '../theme/tokens';

/** '14:00' -> '2pm' in English (as the designs say it), '14:00' in Malay. */
function spokenTime(hhmm, language) {
  if (language !== 'en') return clock(hhmm);
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h < 12 ? 'am' : 'pm';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}:${String(m).padStart(2, '0')}${suffix}` : `${hour}${suffix}`;
}

export function statusText(status, t, language) {
  const time = (value) => spokenTime(value, language);
  switch (status.state) {
    case 'closed_friday_prayers':
      return status.reopens_at
        ? t('place.status.fridayPrayersReopens', { time: time(status.reopens_at) })
        : t('place.status.fridayPrayers');
    case 'open':
      return status.closing_for_friday_prayers
        ? t('place.status.openUntilPrayers', { time: time(status.closes_at) })
        : t('place.status.openUntil', { time: time(status.closes_at) });
    case 'closed':
      return status.opens_at ? t('place.status.closedOpens', { time: time(status.opens_at) }) : t('place.status.closedToday');
    default:
      return t('place.status.hoursNotConfirmed');
  }
}

export function StatusPill({ status }) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const open = status.state === 'open';

  return (
    <View style={[styles.pill, { backgroundColor: open ? colors.selected : colors.hairline }]}>
      <IconClock size={20} strokeWidth={2} color={colors.ink} />
      <Text style={[type.body, styles.text, { color: colors.ink }]}>{statusText(status, t, i18n.language)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.md,
  },
  text: { flex: 1, fontFamily: fonts.bold },
});
