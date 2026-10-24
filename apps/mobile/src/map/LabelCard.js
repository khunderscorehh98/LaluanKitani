// Card for a tapped map label that isn't in our database yet: only what the
// map knows (name, type, position), with Save, Set as… and Share.
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import IconBookmark from '@tabler/icons-react-native/IconBookmark';
import IconBookmarkFilled from '@tabler/icons-react-native/IconBookmarkFilled';
import IconHome from '@tabler/icons-react-native/IconHome';
import IconShare from '@tabler/icons-react-native/IconShare';
import IconX from '@tabler/icons-react-native/IconX';
import { categoryLabel } from '../format';
import { SHORTCUTS, savedFromPin, useSavedPlaces } from '../store/savedPlaces';
import { useTheme } from '../theme/useTheme';
import { fonts, radius, space, type } from '../theme/tokens';

function CardButton({ Icon, label, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, { backgroundColor: colors.selected }, pressed && { opacity: 0.7 }]}
    >
      <Icon size={20} strokeWidth={2} color={colors.ink} />
      <Text style={[styles.buttonLabel, { color: colors.ink }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function LabelCard({ label, onClose }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [lng, lat] = label.lngLat;
  const kind = categoryLabel(label.kind);
  const saved = { ...savedFromPin({ lat, lng }, label.name), detail: kind };
  const isFavourite = useSavedPlaces((state) => state.favourites.some((f) => f.key === saved.key));
  const addFavourite = useSavedPlaces((state) => state.addFavourite);
  const removeFavourite = useSavedPlaces((state) => state.removeFavourite);
  const setShortcut = useSavedPlaces((state) => state.setShortcut);

  const setAs = () =>
    Alert.alert(
      t('labelCard.setAsTitle'),
      label.name,
      SHORTCUTS.map((slot) => ({ text: t(`saved.slots.${slot}`), onPress: () => setShortcut(slot, saved) })),
      { cancelable: true },
    );

  const share = () =>
    Share.share({
      message: [label.name, `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`].join('\n'),
    });

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceRaised }]}>
      <View style={styles.header}>
        <View style={styles.titles}>
          <Text style={[type.h3, { color: colors.ink }]} numberOfLines={2}>
            {label.name}
          </Text>
          {label.checking ? (
            <View style={styles.checking}>
              <ActivityIndicator size="small" color={colors.tealText} />
              <Text style={[type.small, { color: colors.inkMuted }]}>{t('labelCard.checking')}</Text>
            </View>
          ) : (
            <Text style={[type.small, { color: colors.inkMuted }]}>
              {[kind, t('labelCard.fromMap')].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={12}>
          <IconX size={22} strokeWidth={2} color={colors.inkMuted} />
        </Pressable>
      </View>
      {!label.checking && (
        <View style={styles.actions}>
          <CardButton
            Icon={isFavourite ? IconBookmarkFilled : IconBookmark}
            label={isFavourite ? t('place.saved') : t('place.save')}
            onPress={() => (isFavourite ? removeFavourite(saved.key) : addFavourite(saved))}
          />
          <CardButton Icon={IconHome} label={t('labelCard.setAs')} onPress={setAs} />
          <CardButton Icon={IconShare} label={t('place.share')} onPress={share} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space[4],
    borderRadius: radius.md,
    gap: space[3],
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  titles: { flex: 1, gap: 2 },
  checking: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  actions: { flexDirection: 'row', gap: space[2] },
  button: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1],
    borderRadius: radius.md,
  },
  buttonLabel: { fontFamily: fonts.bold, fontSize: 14 },
});
