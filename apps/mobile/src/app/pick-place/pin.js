// Pin a point on the map to save, e.g. a house. The pin stays in the middle
// of the screen; the driver moves the map under it.
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Camera, Map, NativeUserLocation } from '@maplibre/maplibre-react-native';
import IconChevronLeft from '@tabler/icons-react-native/IconChevronLeft';
import IconMapPinFilled from '@tabler/icons-react-native/IconMapPinFilled';
import { Button } from '../../components/Button';
import { BRUNEI_BOUNDS, useOrigin } from '../../location';
import { DEFAULT_CENTER, mapStyle } from '../../map/style';
import { saveTo, savedFromPin } from '../../store/savedPlaces';
import { useTheme } from '../../theme/useTheme';
import { fonts, radius, space, type } from '../../theme/tokens';

const PIN_SIZE = 44;

export default function PinOnMap() {
  const { slot = 'favourite' } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { scheme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { origin, located } = useOrigin();
  const [center, setCenter] = useState(null);
  const [name, setName] = useState('');

  const start = origin ?? DEFAULT_CENTER;
  const [lng, lat] = center ?? start;

  const save = () => {
    saveTo(slot, savedFromPin({ lat, lng }, name.trim() || t('saved.pinnedPlace')));
    router.back();
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.mapArea}>
        <Map
          style={StyleSheet.absoluteFill}
          mapStyle={mapStyle(scheme)}
          logo={false}
          attributionPosition={{ top: insets.top + space[2], right: space[2] }}
          onRegionDidChange={(event) => setCenter(event.nativeEvent.center)}
        >
          {/* Keyed on the origin so the map re-centres once the location arrives */}
          <Camera key={origin ? 'origin' : 'default'} initialViewState={{ center: start, zoom: 16 }} maxBounds={BRUNEI_BOUNDS} />
          {located && <NativeUserLocation />}
        </Map>
        {/* The pin's tip marks the map centre */}
        <View pointerEvents="none" style={styles.pinWrap}>
          <IconMapPinFilled size={PIN_SIZE} color={colors.primary} />
        </View>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={[styles.back, { top: insets.top + space[2], backgroundColor: colors.surfaceRaised }]}
        >
          <IconChevronLeft size={24} strokeWidth={2} color={colors.ink} />
        </Pressable>
      </View>

      <View style={[styles.panel, { backgroundColor: colors.surfaceRaised, paddingBottom: insets.bottom + space[4] }]}>
        <Text style={[type.h3, { color: colors.ink }]}>
          {t('saved.pinTitle', { slot: t(`saved.slots.${slot}`).toLowerCase() })}
        </Text>
        <Text style={[type.small, { color: colors.inkMuted }]}>{t('saved.pinNote')}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('saved.namePlaceholder')}
          placeholderTextColor={colors.inkMuted}
          maxLength={80}
          style={[type.body, styles.input, { color: colors.ink, borderColor: colors.hairline, backgroundColor: colors.surface }]}
        />
        <Button label={t('saved.savePin')} onPress={save} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  mapArea: { flex: 1 },
  pinWrap: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -PIN_SIZE / 2,
    // Lift the pin so its tip, not its middle, sits on the centre
    marginTop: -PIN_SIZE + 2,
  },
  back: {
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
  panel: {
    gap: space[3],
    padding: space[4],
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    marginTop: -radius.lg,
  },
  input: {
    height: 52,
    paddingHorizontal: space[4],
    borderWidth: 1,
    borderRadius: radius.md,
    fontFamily: fonts.medium,
  },
});
