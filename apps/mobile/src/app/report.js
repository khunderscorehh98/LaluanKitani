// Report: drag the map so the pin sits on the spot, pick what's there, confirm.
// While moving, the map stays on the driver's position (no dragging while
// driving) and descriptions are locked; picking and confirming still work.
import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import IconLock from '@tabler/icons-react-native/IconLock';
import IconMapPinFilled from '@tabler/icons-react-native/IconMapPinFilled';
import IconX from '@tabler/icons-react-native/IconX';
import { ApiError, apiPost } from '../api/client';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { inBrunei } from '../location';
import { Camera, Map } from '../map/components';
import { DEFAULT_CENTER, mapStyle } from '../map/style';
import { REPORT_BADGES } from '../reports';
import { useFlash } from '../store/flash';
import { isReady, useSession } from '../store/session';
import { useTheme } from '../theme/useTheme';
import { fonts, radius, space, type } from '../theme/tokens';

const LABELS = ['careful', 'jammed', 'danger', 'flooded', 'closed'];
// Faster than walking pace counts as moving
const MOVING_SPEED_MS = 2.8;
const PIN_SIZE = 48;
const BADGE_SIZE = 44;

/** Where the map starts: the phone in Brunei, else where the caller's map was. */
function useStart(fallback) {
  const [permission] = Location.useForegroundPermissions();
  const [start, setStart] = useState({ lngLat: fallback, moving: false, ready: !permission?.granted });

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) {
      setStart((s) => ({ ...s, ready: true }));
      return;
    }
    Location.getLastKnownPositionAsync({ maxAge: 30_000 })
      .then((last) => {
        const here = last && [last.coords.longitude, last.coords.latitude];
        const moving = (last?.coords.speed ?? 0) > MOVING_SPEED_MS;
        setStart(here && inBrunei(here) ? { lngLat: here, moving, ready: true } : { lngLat: fallback, moving: false, ready: true });
      })
      .catch(() => setStart((s) => ({ ...s, ready: true })));
  }, [permission?.granted]);

  return start;
}

export default function Report() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { scheme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const session = useSession();
  const showFlash = useFlash((state) => state.show);

  const fallback = params.lng && params.lat ? [Number(params.lng), Number(params.lat)] : DEFAULT_CENTER;
  const { lngLat: start, moving, ready } = useStart(fallback);
  const [point, setPoint] = useState(null);
  const [label, setLabel] = useState(null);
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const spot = point ?? start;

  const confirm = async () => {
    if (!isReady(session)) {
      router.push({ pathname: '/sign-in', params: { reason: 'report' } });
      return;
    }
    setSending(true);
    setError(null);
    try {
      await apiPost('/v1/reports', {
        label,
        lng: spot[0],
        lat: spot[1],
        description: moving ? undefined : description.trim() || undefined,
      });
      ['reports', 'place', 'me'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
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
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.mapArea}>
        {ready && (
          <Map
            style={StyleSheet.absoluteFill}
            mapStyle={mapStyle(scheme)}
            logo={false}
            compass={false}
            attributionPosition={{ top: insets.top + space[2], right: space[2] }}
            dragPan={!moving}
            touchRotate={false}
            touchPitch={false}
            onRegionDidChange={(event) => setPoint(event.nativeEvent.center)}
          >
            <Camera initialViewState={{ center: start, zoom: 17 }} />
          </Map>
        )}

        {/* The pin's tip marks the spot; once a problem is picked, its badge rides on top */}
        <View pointerEvents="none" style={styles.pinWrap}>
          {label ? (
            <Image source={REPORT_BADGES[label]} style={styles.badge} />
          ) : (
            <IconMapPinFilled size={PIN_SIZE} color={colors.primary} />
          )}
          {label && <View style={[styles.tip, { backgroundColor: colors.ink }]} />}
        </View>

        <View style={[styles.hint, { top: insets.top + space[2], backgroundColor: colors.surfaceRaised }]}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.cancel')} hitSlop={12}>
            <IconX size={22} strokeWidth={2} color={colors.ink} />
          </Pressable>
          <Text style={[type.small, styles.hintText, { color: colors.ink }]}>
            {moving ? t('report.hintMoving') : t('report.hintDrag')}
          </Text>
        </View>
      </View>

      <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + space[3] }]}>
        <Text style={[type.h3, { color: colors.ink }]} accessibilityRole="header">
          {t('report.whatsThere')}
        </Text>
        <View style={styles.labels}>
          {LABELS.map((option) => {
            const active = option === label;
            return (
              <Pressable
                key={option}
                onPress={() => setLabel(option)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                style={[
                  styles.label,
                  { backgroundColor: colors.surfaceRaised, borderColor: colors.hairline },
                  active && { borderColor: colors.primary, backgroundColor: colors.selected },
                ]}
              >
                <Image source={REPORT_BADGES[option]} style={styles.labelBadge} />
                <Text style={[type.small, styles.labelText, { color: colors.ink }]}>{t(`reportLabels.${option}`)}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.descriptionHeader}>
          <Text style={[type.small, styles.bold, { color: colors.ink }]}>{t('report.description')}</Text>
          <View style={styles.lockNote}>
            <IconLock size={14} strokeWidth={2} color={colors.ink} />
            <Text style={[type.small, styles.bold, { color: colors.ink }]}>{t('report.whenStopped')}</Text>
          </View>
        </View>
        <TextField
          value={description}
          onChangeText={setDescription}
          placeholder={moving ? t('report.drivingNow') : t('report.descriptionPlaceholder')}
          editable={!moving && !sending}
          maxLength={140}
        />

        {error ? <Text style={[type.small, { color: colors.error }]}>{error}</Text> : null}
        <Button
          label={label ? t('report.confirm', { label: t(`reportLabels.${label}`) }) : t('report.pickFirst')}
          onPress={confirm}
          disabled={!label || sending}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  mapArea: { flex: 1 },
  bold: { fontFamily: fonts.bold },
  pinWrap: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    alignItems: 'center',
    marginLeft: -PIN_SIZE / 2,
    // Lift the pin so its tip, not its middle, sits on the centre
    marginTop: -PIN_SIZE + 2,
    width: PIN_SIZE,
  },
  badge: { width: BADGE_SIZE, height: BADGE_SIZE },
  tip: { width: 3, height: PIN_SIZE - BADGE_SIZE + 2, borderRadius: 2 },
  hint: {
    position: 'absolute',
    left: space[4],
    right: space[12],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[3],
    borderRadius: radius.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  hintText: { flex: 1, fontFamily: fonts.bold },
  sheet: {
    gap: space[3],
    paddingHorizontal: space[4],
    paddingTop: space[4],
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    marginTop: -radius.lg,
  },
  labels: { flexDirection: 'row', gap: space[1] },
  label: {
    flex: 1,
    alignItems: 'center',
    gap: space[1],
    paddingVertical: space[3],
    borderWidth: 1.5,
    borderRadius: radius.md,
  },
  labelBadge: { width: 36, height: 36 },
  labelText: { fontFamily: fonts.bold, fontSize: 12 },
  descriptionHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  lockNote: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
});
