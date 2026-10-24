// Choose a place to save as Home / Work / School or a favourite:
// search our places, or pin a point on the map (for houses not in the database).
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import IconMap2 from '@tabler/icons-react-native/IconMap2';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { formatDistance, placeSubtitle } from '../../format';
import { useOrigin } from '../../location';
import { ResultRow } from '../../search/ResultRow';
import { SearchHeader } from '../../search/SearchHeader';
import { MIN_QUERY_LENGTH, useSearch } from '../../search/useSearch';
import { saveTo, savedFromPlace } from '../../store/savedPlaces';
import { useTheme } from '../../theme/useTheme';
import { space, type } from '../../theme/tokens';

export default function PickPlace() {
  const { slot = 'favourite' } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const { origin } = useOrigin();
  const { data, pending } = useSearch(text, origin);
  const typing = text.trim().length >= MIN_QUERY_LENGTH;
  const results = data?.results ?? [];

  const choose = (place) => {
    saveTo(slot, savedFromPlace(place, placeSubtitle(place)));
    router.back();
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.surface }]} edges={['top']}>
      <SearchHeader
        value={text}
        onChangeText={setText}
        busy={pending && typing}
        placeholder={t('saved.pickPlaceholder', { slot: t(`saved.slots.${slot}`).toLowerCase() })}
      />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
        <ListRow
          Icon={IconMap2}
          tile
          strong
          title={t('saved.chooseOnMap')}
          subtitle={t('saved.chooseOnMapNote')}
          onPress={() => router.replace({ pathname: '/pick-place/pin', params: { slot } })}
        />
        {typing && results.length > 0 && (
          <>
            <SectionHeader title={t('search.title')} />
            {results.map((place) => (
              <ResultRow
                key={place.id}
                title={place.name}
                subtitle={placeSubtitle(place)}
                distance={formatDistance(place.distance_m)}
                onPress={() => choose(place)}
              />
            ))}
          </>
        )}
        {typing && data && results.length === 0 && (
          <Text style={[type.small, styles.hint, { color: colors.inkMuted }]}>
            {t('search.noResults', { query: data.query })}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { paddingBottom: space[8] },
  hint: { padding: space[4] },
});
