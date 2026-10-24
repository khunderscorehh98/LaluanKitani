import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { radius, space, type } from '../theme/tokens';

/** White rounded panel with an optional title, used on detail screens. */
export function Card({ title, subtitle, children, style }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceRaised, borderColor: colors.hairline }, style]}>
      {title ? (
        <Text style={[type.h3, { color: colors.ink }]} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {subtitle ? <Text style={[type.small, { color: colors.inkMuted }]}>{subtitle}</Text> : null}
      <View style={title || subtitle ? styles.body : null}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: space[4], borderRadius: radius.md, borderWidth: 1 },
  body: { marginTop: space[3] },
});
