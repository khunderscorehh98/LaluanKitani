import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { fonts, radius, space, type } from '../theme/tokens';

/**
 * Full-width list row: optional leading icon (plain, or in a tinted tile),
 * title, subtitle and an optional trailing element such as an edit button.
 */
export function ListRow({ Icon, tile, tileColor, title, subtitle, strong, muted, onPress, trailing }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.hairline : colors.surfaceRaised, borderColor: colors.hairline },
      ]}
    >
      {Icon &&
        (tile ? (
          <View style={[styles.tile, { backgroundColor: tileColor ?? colors.selected }]}>
            <Icon size={22} strokeWidth={2} color={colors.tealText} />
          </View>
        ) : (
          <Icon size={22} strokeWidth={2} color={colors.inkMuted} />
        ))}
      <View style={styles.text}>
        <Text style={[type.body, strong && styles.strong, { color: muted ? colors.inkMuted : colors.ink }]}>{title}</Text>
        {subtitle ? <Text style={[type.small, { color: colors.inkMuted }]}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tile: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  strong: { fontFamily: fonts.bold },
});
