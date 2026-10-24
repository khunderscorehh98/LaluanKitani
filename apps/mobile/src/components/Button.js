import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { fonts, radius, space } from '../theme/tokens';

/**
 * variant 'primary': filled teal, full width.
 * variant 'text': teal label only, for the secondary choice under a primary button.
 */
export function Button({ label, onPress, variant = 'primary', disabled = false, style }) {
  const { colors } = useTheme();
  const primary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        primary && { backgroundColor: colors.primary },
        (pressed || disabled) && { opacity: 0.7 },
        style,
      ]}
    >
      <Text style={[styles.label, { color: primary ? colors.onPrimary : colors.tealText }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 56 pt tall: easy to hit, including with a thumb in a car mount
  base: {
    minHeight: 56,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, textAlign: 'center' },
});
