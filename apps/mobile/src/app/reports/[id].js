// Report details: what was reported, by whom, and "Still there?" voting.
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Camera, GeoJSONSource, Images, Layer, Map } from '@maplibre/maplibre-react-native';
import IconX from '@tabler/icons-react-native/IconX';
import { ApiError, apiGet, apiPost } from '../../api/client';
import { Button } from '../../components/Button';
import { formatDistance, timeAgo } from '../../format';
import { useOrigin } from '../../location';
import { mapStyle } from '../../map/style';
import { REPORT_BADGES } from '../../reports';
import { useFlash } from '../../store/flash';
import { isReady, useSession } from '../../store/session';
import { useTheme } from '../../theme/useTheme';
import { fonts, radius, space, type } from '../../theme/tokens';

const MAP_HEIGHT = 300;

function ReportMap({ report }) {
  const { scheme } = useTheme();
  const center = [report.location.lng, report.location.lat];
  const point = { type: 'Feature', geometry: { type: 'Point', coordinates: center }, properties: {} };
  return (
    <Map
      style={{ height: MAP_HEIGHT }}
      mapStyle={mapStyle(scheme)}
      logo={false}
      attribution={false}
      compass={false}
      dragPan={false}
      touchZoom={false}
      touchRotate={false}
      touchPitch={false}
      doubleTapZoom={false}
      doubleTapHoldZoom={false}
    >
      <Camera initialViewState={{ center, zoom: 16 }} />
      <Images images={{ badge: REPORT_BADGES[report.label] }} />
      <GeoJSONSource id="report" data={point}>
        <Layer id="report-badge" type="symbol" layout={{ 'icon-image': 'badge', 'icon-size': 1.3, 'icon-allow-overlap': true }} />
      </GeoJSONSource>
    </Map>
  );
}

const initials = (nickname) =>
  nickname
    .split('_')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

export default function ReportDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const session = useSession();
  const showFlash = useFlash((state) => state.show);
  const { origin } = useOrigin();
  const [voting, setVoting] = useState(null);
  const [voteError, setVoteError] = useState(null);

  const [lng, lat] = origin ?? [];
  const queryKey = ['report', id, Boolean(session.token), lng, lat];
  const { data, error } = useQuery({
    queryKey,
    queryFn: ({ signal }) => apiGet(`/v1/reports/${id}`, { lat, lng }, { signal }),
    placeholderData: (previous) => previous,
  });
  const report = data?.report;

  const vote = async (value) => {
    if (!isReady(session)) {
      router.push({ pathname: '/sign-in', params: { reason: 'report' } });
      return;
    }
    setVoting(value);
    setVoteError(null);
    try {
      const res = await apiPost(`/v1/reports/${id}/votes`, { vote: value });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['place'] });
      if (res.cleared) {
        showFlash(t('reportDetail.clearedThanks'));
        router.back();
      } else {
        queryClient.setQueryData(queryKey, { report: res.report });
      }
    } catch (err) {
      setVoteError(err instanceof ApiError && err.code === 'own_report' ? t('reportDetail.yours') : t('map.offline'));
    } finally {
      setVoting(null);
    }
  };

  const close = (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel={t('common.close')}
      style={[styles.close, { top: insets.top + space[2], backgroundColor: colors.surfaceRaised }]}
    >
      <IconX size={22} strokeWidth={2} color={colors.ink} />
    </Pressable>
  );

  if (!report) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.surface }]}>
        {error ? (
          <Text style={[type.body, styles.message, { color: colors.ink }]}>
            {error.status === 404 ? t('reportDetail.gone') : t('map.offline')}
          </Text>
        ) : (
          <ActivityIndicator color={colors.tealText} />
        )}
        {close}
      </View>
    );
  }

  const where = [report.road_name, formatDistance(report.distance_m)].filter(Boolean).join(' · ');
  const stillThere = report.votes.still_there;

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space[6] }}>
        <ReportMap report={report} />
        <View style={[styles.sheet, { backgroundColor: colors.surfaceRaised }]}>
          <View style={styles.heading}>
            <Image source={REPORT_BADGES[report.label]} style={styles.badge} />
            <View style={styles.headingText}>
              <Text style={[type.h2, { color: colors.ink }]} accessibilityRole="header">
                {t(`reportLabels.${report.label}`)}
              </Text>
              {where ? <Text style={[type.small, { color: colors.inkMuted }]}>{where}</Text> : null}
            </View>
          </View>

          {report.description ? (
            <View style={[styles.description, { backgroundColor: colors.surface }]}>
              <Text style={[type.body, { color: colors.ink }]}>{report.description}</Text>
            </View>
          ) : null}

          <Text style={[type.small, { color: colors.inkMuted }]}>
            {[
              t('reportDetail.reported', { ago: timeAgo(report.created_at) }),
              stillThere > 0 ? t('reportDetail.stillThereCount', { count: stillThere }) : null,
              report.confirmed && report.routing_effect === 'hard_avoid' ? t('reportDetail.confirmed') : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>

          {report.reporter && (
            <View style={styles.reporter}>
              <View style={[styles.avatar, { backgroundColor: colors.selected }]}>
                <Text style={[styles.avatarText, { color: colors.tealText }]}>{initials(report.reporter.nickname)}</Text>
              </View>
              <Text style={[type.body, styles.nickname, { color: colors.ink }]}>{report.reporter.nickname}</Text>
            </View>
          )}

          {report.mine ? (
            <Text style={[type.small, styles.mine, { color: colors.inkMuted }]}>{t('reportDetail.yours')}</Text>
          ) : (
            <View style={styles.vote}>
              <Text style={[type.body, styles.question, { color: colors.ink }]}>{t('reportDetail.stillThereQ')}</Text>
              <View style={styles.voteButtons}>
                <Button
                  label={t('reportDetail.stillThere')}
                  onPress={() => vote('still_there')}
                  disabled={Boolean(voting)}
                  style={[styles.voteButton, report.my_vote === 'gone' && { opacity: 0.6 }]}
                />
                <Pressable
                  onPress={() => vote('gone')}
                  disabled={Boolean(voting)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.voteButton,
                    styles.goneButton,
                    { backgroundColor: report.my_vote === 'gone' ? colors.selected : colors.hairline },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[type.body, styles.goneText, { color: colors.ink }]}>{t('reportDetail.gone_button')}</Text>
                </Pressable>
              </View>
              {report.my_vote ? (
                <Text style={[type.small, { color: colors.inkMuted }]}>
                  {t(report.my_vote === 'gone' ? 'reportDetail.youSaidGone' : 'reportDetail.youSaidStillThere')}
                </Text>
              ) : null}
              {voteError ? <Text style={[type.small, { color: colors.error }]}>{voteError}</Text> : null}
            </View>
          )}
        </View>
      </ScrollView>
      {close}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6] },
  message: { textAlign: 'center' },
  close: {
    position: 'absolute',
    left: space[4],
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  sheet: {
    marginTop: -radius.lg,
    padding: space[4],
    paddingTop: space[6],
    gap: space[3],
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  badge: { width: 48, height: 48 },
  headingText: { flex: 1 },
  description: { padding: space[3], borderRadius: radius.md },
  reporter: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bold, fontSize: 14 },
  nickname: { fontFamily: fonts.bold },
  mine: { marginTop: space[3] },
  vote: { gap: space[2], marginTop: space[4] },
  question: { fontFamily: fonts.bold },
  voteButtons: { flexDirection: 'row', gap: space[2] },
  voteButton: { flex: 1 },
  goneButton: { minHeight: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  goneText: { fontFamily: fonts.bold, fontSize: 18 },
});
