import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { space, type } from '../theme/tokens';

/** Small upper-case heading between list sections, e.g. BEST MATCH. */
export function SectionHeader({ title }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <Text style={[type.caption, { color: colors.inkMuted }]} accessibilityRole="header">
        {title.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: space[4],
    paddingTop: space[4],
    paddingBottom: space[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
