// Back button and search field, used at the top of Search and the place pickers.
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import IconChevronLeft from '@tabler/icons-react-native/IconChevronLeft';
import IconX from '@tabler/icons-react-native/IconX';
import { useTheme } from '../theme/useTheme';
import { fonts, radius, space, type } from '../theme/tokens';

export function SearchHeader({ value, onChangeText, busy, placeholder, autoFocus = true }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.back')} hitSlop={12}>
        <IconChevronLeft size={24} strokeWidth={2} color={colors.ink} />
      </Pressable>
      <View style={[styles.field, { backgroundColor: colors.surfaceRaised, borderColor: colors.primary }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? t('map.searchPlaceholder')}
          placeholderTextColor={colors.inkMuted}
          autoFocus={autoFocus}
          autoCorrect={false}
          returnKeyType="search"
          style={[type.body, styles.input, { color: colors.ink }]}
          accessibilityLabel={t('search.title')}
        />
        {busy ? <ActivityIndicator size="small" color={colors.tealText} /> : null}
        {value ? (
          <Pressable
            onPress={() => onChangeText('')}
            accessibilityRole="button"
            accessibilityLabel={t('search.clear')}
            hitSlop={8}
          >
            <IconX size={20} strokeWidth={2} color={colors.inkMuted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    height: 52,
    paddingHorizontal: space[4],
    borderWidth: 1.5,
    borderRadius: radius.md,
  },
  input: { flex: 1, fontFamily: fonts.bold, paddingVertical: 0 },
});
