import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { fonts, radius, space, type } from '../theme/tokens';

/** Labelled text input with an optional hint or error underneath. */
export function TextField({ label, error, hint, style, inputStyle, ...inputProps }) {
  const { colors } = useTheme();
  return (
    <View style={style}>
      {label ? <Text style={[type.small, styles.label, { color: colors.ink }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.inkMuted}
        style={[
          type.body,
          styles.input,
          { color: colors.ink, backgroundColor: colors.surfaceRaised, borderColor: error ? colors.error : colors.hairline },
          inputStyle,
        ]}
        accessibilityLabel={label}
        {...inputProps}
      />
      {error || hint ? (
        <Text style={[type.small, styles.below, { color: error ? colors.error : colors.inkMuted }]}>{error || hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.bold, marginBottom: space[2] },
  input: { minHeight: 52, paddingHorizontal: space[4], borderWidth: 1.5, borderRadius: radius.md },
  below: { marginTop: space[2] },
});
