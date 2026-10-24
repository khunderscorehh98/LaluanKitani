// One search result. The number matches its pin on the results map.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import IconCheck from '@tabler/icons-react-native/IconCheck';
import { useTheme } from '../theme/useTheme';
import { fonts, radius, space, type } from '../theme/tokens';

export function NumberBadge({ number, filled }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.badge,
        { borderColor: colors.primary },
        filled && { backgroundColor: colors.primary },
      ]}
    >
      <Text style={[styles.badgeText, { color: filled ? colors.onPrimary : colors.tealText }]}>{number}</Text>
    </View>
  );
}

export function ResultRow({ number, filled, title, subtitle, chip, distance, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.hairline : colors.surfaceRaised, borderColor: colors.hairline },
      ]}
    >
      {number !== undefined && <NumberBadge number={number} filled={filled} />}
      <View style={styles.body}>
        <Text style={[type.body, styles.title, { color: colors.ink }]}>{title}</Text>
        {subtitle ? <Text style={[type.small, { color: colors.inkMuted }]}>{subtitle}</Text> : null}
        {chip ? (
          <View style={[styles.chip, { backgroundColor: colors.selected }]}>
            <IconCheck size={14} strokeWidth={2.5} color={colors.ink} />
            <Text style={[type.small, styles.chipText, { color: colors.ink }]}>{chip}</Text>
          </View>
        ) : null}
      </View>
      {distance ? <Text style={[type.small, styles.distance, { color: colors.ink }]}>{distance}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    width: 28,
    height: 28,
    marginTop: 2,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18 },
  body: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.bold },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space[1],
    marginTop: space[1],
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  chipText: { fontFamily: fonts.bold, fontSize: 13 },
  distance: { fontFamily: fonts.bold, marginTop: 2 },
});
