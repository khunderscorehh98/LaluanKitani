// Report sheet: one tap on a label sends the report. A description can only
// be typed while stopped, so nobody types while driving.
import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import IconLock from '@tabler/icons-react-native/IconLock';
import { ApiError, apiPost } from '../api/client';
import { TextField } from '../components/TextField';
import { currentLngLat, inBrunei } from '../location';
import { REPORT_BADGES } from '../reports';
import { useFlash } from '../store/flash';
import { isReady, useSession } from '../store/session';
import { useTheme } from '../theme/useTheme';
import { fonts, radius, space, type } from '../theme/tokens';

const LABELS = ['careful', 'jammed', 'danger', 'flooded', 'closed'];
// Faster than walking pace counts as moving: no typing
const MOVING_SPEED_MS = 2.8;

/** Where the report goes: the phone's position in Brunei, else the map centre it was opened from. */
function useReportPoint(mapCenter) {
  const [permission] = Location.useForegroundPermissions();
  const [point, setPoint] = useState({ lngLat: mapCenter, fromDevice: false, moving: false });

  useEffect(() => {
    if (!permission?.granted) return;
    Location.getLastKnownPositionAsync({ maxAge: 30_000 })
      .then(async (last) => {
        const moving = (last?.coords.speed ?? 0) > MOVING_SPEED_MS;
        const lngLat = last ? [last.coords.longitude, last.coords.latitude] : await currentLngLat();
        if (inBrunei(lngLat)) setPoint({ lngLat, fromDevice: true, moving });
        else setPoint((p) => ({ ...p, moving }));
      })
      .catch(() => {});
  }, [permission?.granted]);

  return point;
}

export default function ReportSheet() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const session = useSession();
  const showFlash = useFlash((state) => state.show);
  const mapCenter = params.lng && params.lat ? [Number(params.lng), Number(params.lat)] : null;
  const { lngLat, fromDevice, moving } = useReportPoint(mapCenter);
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(null);
  const [error, setError] = useState(null);

  const send = async (label) => {
    if (!isReady(session)) {
      router.push({ pathname: '/sign-in', params: { reason: 'report' } });
      return;
    }
    if (!lngLat) {
      setError(t('report.errors.noLocation'));
      return;
    }
    setSending(label);
    setError(null);
    try {
      await apiPost('/v1/reports', {
        label,
        lng: lngLat[0],
        lat: lngLat[1],
        description: moving ? undefined : description.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['place'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      showFlash(t('report.thanks'));
      router.back();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null;
      setError(
        code === 'too_many_reports'
          ? t('report.errors.tooMany')
          : code === 'invalid_request'
            ? t('report.errors.outsideBrunei')
            : t('map.offline'),
      );
    } finally {
      setSending(null);
    }
  };

  return (
    <View style={styles.screen}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} accessibilityLabel={t('common.cancel')} />
      {/* Android resizes the window for the keyboard itself; iOS needs the padding */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + space[4] }]}>
        <View style={[styles.handle, { backgroundColor: colors.hairline }]} />
        <View style={styles.titleRow}>
          <Text style={[type.h2, { color: colors.ink }]} accessibilityRole="header">
            {t('report.title')}
          </Text>
          <Text style={[type.small, styles.tagline, { color: colors.ink }]}>{t('report.oneTap')}</Text>
        </View>
        <Text style={[type.small, { color: colors.inkMuted }]}>
          {fromDevice ? t('report.atYourLocation') : t('report.atMapCentre')}
        </Text>

        <View style={styles.labels}>
          {LABELS.map((label) => (
            <Pressable
              key={label}
              onPress={() => send(label)}
              disabled={Boolean(sending)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.label,
                { backgroundColor: colors.surfaceRaised, borderColor: colors.hairline },
                (pressed || sending === label) && { borderColor: colors.primary, backgroundColor: colors.selected },
                sending && sending !== label && { opacity: 0.5 },
              ]}
            >
              <Image source={REPORT_BADGES[label]} style={styles.badge} />
              <Text style={[type.h3, { color: colors.ink }]}>{t(`reportLabels.${label}`)}</Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={[type.small, styles.error, { color: colors.error }]}>{error}</Text> : null}

        <View style={styles.descriptionHeader}>
          <Text style={[type.small, styles.descriptionLabel, { color: colors.ink }]}>{t('report.description')}</Text>
          <View style={styles.lockNote}>
            <IconLock size={14} strokeWidth={2} color={colors.ink} />
            <Text style={[type.small, styles.descriptionLabel, { color: colors.ink }]}>{t('report.whenStopped')}</Text>
          </View>
        </View>
        <TextField
          value={description}
          onChangeText={setDescription}
          placeholder={moving ? t('report.drivingNow') : t('report.descriptionPlaceholder')}
          editable={!moving && !sending}
          maxLength={140}
          inputStyle={[styles.descriptionInput, { borderColor: colors.inkMuted }]}
        />

        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cancel, { backgroundColor: colors.hairline }, pressed && { opacity: 0.7 }]}
        >
          <Text style={[type.body, styles.cancelText, { color: colors.ink }]}>{t('common.cancel')}</Text>
        </Pressable>
      </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  // The backdrop can't dim the map on Android (MapLibre draws on a native
  // surface above normal views), so the sheet carries its own shadow
  sheet: {
    paddingHorizontal: space[4],
    paddingTop: space[2],
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: space[3] },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  tagline: { fontFamily: fonts.bold },
  labels: { gap: space[2], marginTop: space[3] },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    minHeight: 64,
    paddingHorizontal: space[4],
    borderWidth: 1.5,
    borderRadius: radius.md,
  },
  badge: { width: 40, height: 40 },
  error: { marginTop: space[2] },
  descriptionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[4], marginBottom: space[2] },
  descriptionLabel: { fontFamily: fonts.bold },
  lockNote: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  descriptionInput: { borderStyle: 'dashed' },
  cancel: { marginTop: space[3], height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: fonts.bold },
});
