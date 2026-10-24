// One route choice in the preview: time, distance, the road it goes via, and
// what's on the way (Peak Spots, reports).
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import IconAlertTriangle from '@tabler/icons-react-native/IconAlertTriangle';
import IconClock from '@tabler/icons-react-native/IconClock';
import { clock, formatDistance } from '../format';
import { useTheme } from '../theme/useTheme';
import { fonts, radius, reportColors, space, type } from '../theme/tokens';

function Chip({ Icon, text, color }) {
  const { scheme } = useTheme();
  // Report colours are only used as tints here, beside their icon (brand rule:
  // they mark map warnings, never buttons)
  return (
    <View style={[styles.chip, { backgroundColor: `${color}${scheme === 'dark' ? '40' : '24'}` }]}>
      <Icon size={14} strokeWidth={2} color={color} />
      <Text style={[styles.chipText, { color: scheme === 'dark' ? '#F9FAFB' : '#1F2937' }]}>{text}</Text>
    </View>
  );
}

/** The window that matters for a trip leaving at `departAt`: the next one today, else the first. */
function windowFor(windows, departAt) {
  const d = new Date(departAt);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return windows.find((w) => w.ends > time) ?? windows[0];
}

export function RouteOption({ route, departAt, selected, onPress }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const minutes = Math.max(1, Math.round(route.duration_s / 60));
  const warnings = route.reports.filter((r) => r.routing_effect !== 'hard_avoid');

  // Group reports by label: "1 Careful report", "2 Jammed reports"
  const byLabel = {};
  for (const r of warnings) byLabel[r.label] = (byLabel[r.label] ?? 0) + 1;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={[
        styles.card,
        { backgroundColor: colors.surfaceRaised, borderColor: colors.hairline },
        selected && { borderColor: colors.primary, backgroundColor: colors.selected },
      ]}
    >
      <View style={[styles.radio, { borderColor: selected ? colors.ink : colors.inkMuted }]}>
        {selected && <View style={[styles.radioDot, { backgroundColor: colors.ink }]} />}
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.time, { color: selected ? colors.tealText : colors.ink }]}>
            {t('route.minutes', { count: minutes })}
          </Text>
          <Text style={[type.small, { color: colors.ink }]}>{formatDistance(route.distance_m)}</Text>
        </View>
        <Text style={[type.small, { color: colors.inkMuted }]} numberOfLines={1}>
          {[
            route.via && t('route.via', { road: route.via }),
            !route.peak_spots.length && !warnings.length ? t('route.noReports') : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        {(route.peak_spots.length > 0 || warnings.length > 0) && (
          <View style={styles.chips}>
            {route.peak_spots.map((spot) => {
              const window = windowFor(spot.windows, departAt);
              return (
                <Chip
                  key={spot.id}
                  Icon={IconClock}
                  color={reportColors.jammed}
                  text={window ? `${t('route.peakSpot')} ${clock(window.starts)}–${clock(window.ends)}` : t('route.peakSpot')}
                />
              );
            })}
            {Object.entries(byLabel).map(([label, count]) => (
              <Chip
                key={label}
                Icon={IconAlertTriangle}
                color={reportColors[label]}
                text={t('route.reportCount', { count, label: t(`reportLabels.${label}`) })}
              />
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: space[3],
    padding: space[3],
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  radio: {
    width: 22,
    height: 22,
    marginTop: 4,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  time: { fontFamily: fonts.extraBold, fontSize: 22, lineHeight: 28 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[1] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  chipText: { fontFamily: fonts.bold, fontSize: 13 },
});
