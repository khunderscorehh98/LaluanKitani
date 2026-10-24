import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import IconShieldCheck from '@tabler/icons-react-native/IconShieldCheck';
import IconUser from '@tabler/icons-react-native/IconUser';
import { useTheme } from '../theme/useTheme';
import { fonts, radius, space } from '../theme/tokens';

// Level 3 and up show the badge publicly; lower levels only on your own profile
export const TRUSTED_LEVEL = 3;

/** 'pemandu_gadong' -> 'PG'. Nicknames are the only name we have (no real names). */
export function initials(nickname) {
  return nickname
    .split(/[_\d]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || nickname.slice(0, 2).toUpperCase();
}

export function Avatar({ nickname, size = 40 }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.selected }]}>
      {nickname ? (
        <Text style={[styles.initials, { color: colors.tealText, fontSize: size * 0.36 }]}>{initials(nickname)}</Text>
      ) : (
        <IconUser size={size * 0.5} strokeWidth={2} color={colors.tealText} />
      )}
    </View>
  );
}

/** Level name pill. Filled teal with a shield from Trusted reporter up, as in the designs. */
export function LevelBadge({ level, levelKey }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const trusted = level >= TRUSTED_LEVEL;
  return (
    <View
      style={[
        styles.badge,
        trusted ? { backgroundColor: colors.primary } : { borderColor: colors.hairline, borderWidth: 1 },
      ]}
    >
      {trusted && <IconShieldCheck size={14} strokeWidth={2} color={colors.onPrimary} />}
      <Text style={[styles.badgeText, { color: trusted ? colors.onPrimary : colors.inkMuted }]}>
        {t(`levels.${levelKey}`).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fonts.bold },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space[1],
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.5 },
});
