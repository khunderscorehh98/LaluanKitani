// "Arrive by" time chooser: today's (or tomorrow's) times in 15-minute steps.
// Plain React Native, so it works in Expo Go and without a native rebuild.
import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { formatClock } from '../format';
import { useTheme } from '../theme/useTheme';
import { fonts, radius, space, type } from '../theme/tokens';

const STEP_MIN = 15;
const HOURS_AHEAD = 18;

/** The next 15-minute marks, starting at least 15 minutes from now. */
function upcomingTimes(now = new Date()) {
  const first = new Date(now);
  first.setSeconds(0, 0);
  first.setMinutes(Math.ceil((first.getMinutes() + STEP_MIN) / STEP_MIN) * STEP_MIN);
  return Array.from({ length: (HOURS_AHEAD * 60) / STEP_MIN }, (_, i) => new Date(first.getTime() + i * STEP_MIN * 60_000));
}

export function TimePicker({ visible, value, onPick, onClear, onClose }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const times = useMemo(() => (visible ? upcomingTimes() : []), [visible]);
  const today = new Date().getDate();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
      <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + space[3] }]}>
        <View style={styles.header}>
          <Text style={[type.h3, { color: colors.ink }]} accessibilityRole="header">
            {t('route.arriveBy')}
          </Text>
          {value && (
            <Pressable onPress={onClear} accessibilityRole="button" hitSlop={8}>
              <Text style={[type.body, styles.clear, { color: colors.tealText }]}>{t('route.leaveNow')}</Text>
            </Pressable>
          )}
        </View>
        {/* 72 rows: a plain ScrollView, so every row is laid out before it can be tapped */}
        <ScrollView>
          {times.map((item) => {
            const active = value && item.getTime() === value.getTime();
            return (
              <Pressable
                key={item.getTime()}
                onPress={() => onPick(item)}
                accessibilityRole="radio"
                accessibilityState={{ checked: Boolean(active) }}
                style={({ pressed }) => [
                  styles.row,
                  { borderColor: colors.hairline },
                  (active || pressed) && { backgroundColor: colors.selected },
                ]}
              >
                <Text style={[type.body, styles.time, { color: colors.ink }]}>{formatClock(item)}</Text>
                {item.getDate() !== today && (
                  <Text style={[type.small, { color: colors.inkMuted }]}>{t('route.tomorrow')}</Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { maxHeight: '60%', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingTop: space[4] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    paddingBottom: space[2],
  },
  clear: { fontFamily: fonts.bold },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  time: { fontFamily: fonts.bold },
});
