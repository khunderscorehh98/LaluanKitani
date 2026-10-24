// Live reports near the place, nearest first.
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import IconChevronRight from '@tabler/icons-react-native/IconChevronRight';
import { Card } from '../components/Card';
import { formatDistance, timeAgo } from '../format';
import { REPORT_BADGES } from '../reports';
import { useTheme } from '../theme/useTheme';
import { fonts, space, type } from '../theme/tokens';

export function ReportsCard({ reports }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!reports.length) return null;

  return (
    <Card title={t('place.reportsNearby')}>
      {reports.map((report, index) => (
        <Pressable
          key={report.id}
          onPress={() => router.push(`/reports/${report.id}`)}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.row,
            index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
            pressed && { opacity: 0.6 },
          ]}
        >
          <Image source={REPORT_BADGES[report.label]} style={styles.badge} />
          <View style={styles.text}>
            <Text style={[type.body, styles.title, { color: colors.ink }]}>
              {[t(`reportLabels.${report.label}`), report.road_name].filter(Boolean).join(' · ')}
            </Text>
            <Text style={[type.small, { color: colors.inkMuted }]}>
              {t('place.reportMeta', { distance: formatDistance(report.distance_m), ago: timeAgo(report.created_at) })}
            </Text>
          </View>
          <IconChevronRight size={20} strokeWidth={2} color={colors.inkMuted} />
        </Pressable>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2] },
  badge: { width: 34, height: 34 },
  text: { flex: 1 },
  title: { fontFamily: fonts.bold },
});
