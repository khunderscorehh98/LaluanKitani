// Profile tab: who you are on Laluan Kitani, your points and level, and your reports.
// Signed out, it explains what an account is for. Settings open from the gear.
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import IconSettings from '@tabler/icons-react-native/IconSettings';
import { apiGet } from '../../api/client';
import { Avatar, LevelBadge } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { SectionHeader } from '../../components/SectionHeader';
import { formatDuration, formatWhen } from '../../format';
import { REPORT_BADGES } from '../../reports';
import { useSession } from '../../store/session';
import { useTheme } from '../../theme/useTheme';
import { fonts, palette, radius, space, type } from '../../theme/tokens';

/** Second line of a My reports row: when, then what happened to it. */
function reportOutcome(t, report) {
  const stillThere = report.votes.still_there;
  switch (report.status) {
    case 'cleared':
      return report.ended_at
        ? t('profile.outcome.clearedAfter', {
            duration: formatDuration((new Date(report.ended_at) - new Date(report.created_at)) / 60_000),
          })
        : t('profile.outcome.cleared');
    case 'expired':
      return t('profile.outcome.ended');
    case 'removed':
      return t('profile.outcome.removed');
    default:
      return stillThere > 0 ? t('profile.outcome.confirmedBy', { count: stillThere }) : t('profile.outcome.live');
  }
}

function IconButton({ Icon, label, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: colors.surfaceRaised, borderColor: colors.hairline },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Icon size={22} strokeWidth={2} color={colors.ink} />
    </Pressable>
  );
}

export default function ProfileTab() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { token, user } = useSession();
  const ready = Boolean(token && user?.nickname);

  const stats = useQuery({
    queryKey: ['me', 'stats', user?.id],
    queryFn: ({ signal }) => apiGet('/v1/me/stats', {}, { signal }),
    enabled: ready,
  });
  const reports = useQuery({
    queryKey: ['me', 'reports', user?.id],
    queryFn: ({ signal }) => apiGet('/v1/me/reports', { limit: 20 }, { signal }),
    enabled: ready,
  });

  const openSignIn = () => router.push({ pathname: '/sign-in', params: { reason: 'profile' } });
  const s = stats.data?.stats;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.surface }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          ready ? (
            <RefreshControl
              refreshing={stats.isRefetching || reports.isRefetching}
              onRefresh={() => {
                stats.refetch();
                reports.refetch();
              }}
              tintColor={colors.tealText}
            />
          ) : undefined
        }
      >
        <View style={styles.topBar}>
          <IconButton Icon={IconSettings} label={t('settings.title')} onPress={() => router.push('/settings')} />
        </View>

        <View style={styles.identity}>
          <Avatar nickname={ready ? user.nickname : null} size={72} />
          <View style={styles.identityText}>
            <Text style={[type.h2, { color: colors.ink }]} numberOfLines={1} accessibilityRole="header">
              {ready ? user.nickname : t('tabs.profile')}
            </Text>
            {ready && s && <LevelBadge level={s.level} levelKey={s.key} />}
          </View>
        </View>

        {!token && (
          <Card title={t('profile.signedOutTitle')} subtitle={t('profile.signedOutBody')} style={styles.block}>
            <Button label={t('profile.signIn')} onPress={openSignIn} />
          </Card>
        )}

        {token && !user?.nickname && (
          <Card title={t('profile.needsNicknameTitle')} subtitle={t('profile.needsNicknameBody')} style={styles.block}>
            <Button label={t('profile.pickNickname')} onPress={openSignIn} />
          </Card>
        )}

        {ready && s && (
          <>
            <Card style={styles.block}>
              <View style={styles.pointsRow}>
                <Text style={[styles.points, { color: colors.ink }]}>
                  {s.points.toLocaleString('en')}
                  <Text style={[type.body, { color: colors.ink }]}> {t('profile.points')}</Text>
                </Text>
                <Text style={[type.small, styles.levelOf, { color: colors.ink }]}>
                  {t('profile.levelOf', { level: s.level, of: s.of })}
                </Text>
              </View>
              <PointsBar stats={s} />
              <Text style={[type.small, { color: colors.inkMuted, marginTop: space[2] }]}>
                {s.next
                  ? t('profile.toNextLevel', { points: s.next.points_to_go.toLocaleString('en'), level: t(`levels.${s.next.key}`) })
                  : t('profile.topLevel')}
              </Text>
            </Card>

            <View style={[styles.thanks, { backgroundColor: colors.friendly }]}>
              <Text style={[type.h3, styles.thanksTitle]}>{t('profile.thanksTitle')}</Text>
              <Text style={[type.small, styles.thanksBody]}>
                {s.reports_this_month > 0
                  ? t('profile.thanksBody', { count: s.reports_this_month })
                  : t('profile.thanksEmpty')}
              </Text>
            </View>

            <SectionHeader title={t('profile.myReports')} />
            {(reports.data?.reports ?? []).map((report) => {
              const live = report.status === 'active';
              return (
                <Pressable
                  key={report.id}
                  onPress={live ? () => router.push(`/reports/${report.id}`) : undefined}
                  disabled={!live}
                  accessibilityRole={live ? 'button' : undefined}
                  style={({ pressed }) => [
                    styles.reportRow,
                    { backgroundColor: pressed ? colors.hairline : colors.surfaceRaised, borderColor: colors.hairline },
                  ]}
                >
                  <Image source={REPORT_BADGES[report.label]} style={[styles.badge, !live && { opacity: 0.5 }]} />
                  <View style={styles.reportText}>
                    <Text style={[type.body, styles.reportTitle, { color: colors.ink }]}>
                      {[t(`reportLabels.${report.label}`), report.road_name].filter(Boolean).join(' · ')}
                    </Text>
                    <Text style={[type.small, { color: colors.inkMuted }]}>
                      {`${formatWhen(report.created_at)} · ${reportOutcome(t, report)}`}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            {reports.data && reports.data.reports.length === 0 && (
              <Text style={[type.small, styles.empty, { color: colors.inkMuted }]}>{t('profile.noReports')}</Text>
            )}
          </>
        )}

        {ready && (stats.error || reports.error) && !s && (
          <Text style={[type.small, styles.empty, { color: colors.inkMuted }]}>{t('map.offline')}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Progress from the start of the current level to the next one. */
function PointsBar({ stats }) {
  const { colors } = useTheme();
  const fraction = stats.next ? (stats.points - stats.from) / (stats.next.at - stats.from) : 1;
  return (
    <View style={[styles.bar, { backgroundColor: colors.hairline }]}>
      <View style={[styles.barFill, { width: `${Math.min(100, Math.max(2, fraction * 100))}%`, backgroundColor: colors.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: space[8] },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', gap: space[2], paddingHorizontal: space[4], paddingTop: space[2] },
  iconButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space[4], paddingHorizontal: space[4], marginTop: space[2] },
  identityText: { flex: 1, gap: space[1] },
  block: { marginHorizontal: space[4], marginTop: space[4] },
  pointsRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  points: { fontFamily: fonts.extraBold, fontSize: 28, lineHeight: 36 },
  levelOf: { fontFamily: fonts.bold },
  bar: { height: 8, borderRadius: radius.pill, marginTop: space[2], overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radius.pill },
  // Warm sand is light in both modes, so its text is always charcoal
  thanks: { marginHorizontal: space[4], marginTop: space[4], marginBottom: space[2], padding: space[4], borderRadius: radius.md },
  thanksTitle: { color: palette.charcoal, fontFamily: fonts.extraBold },
  thanksBody: { color: palette.charcoal, marginTop: space[1] },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  badge: { width: 36, height: 36 },
  reportText: { flex: 1 },
  reportTitle: { fontFamily: fonts.bold },
  empty: { paddingHorizontal: space[4], paddingVertical: space[3] },
});
