// Search: names, local aliases, simpang numbers and everyday needs ("passport").
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import IconClock from '@tabler/icons-react-native/IconClock';
import IconMapPin from '@tabler/icons-react-native/IconMapPin';
import IconRoad from '@tabler/icons-react-native/IconRoad';
import { ListRow } from '../components/ListRow';
import { SectionHeader } from '../components/SectionHeader';
import { formatDistance, placeSubtitle } from '../format';
import { useOrigin } from '../location';
import { ResultRow } from '../search/ResultRow';
import { ResultsMap } from '../search/ResultsMap';
import { SearchHeader } from '../search/SearchHeader';
import { MIN_QUERY_LENGTH, useSearch } from '../search/useSearch';
import { useRecentSearches } from '../store/recentSearches';
import { useTheme } from '../theme/useTheme';
import { radius, space, type } from '../theme/tokens';

export default function Search() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const { origin, located } = useOrigin();
  const { query, data, pending, error } = useSearch(text, origin);
  const recent = useRecentSearches((state) => state.items);
  const addRecent = useRecentSearches((state) => state.add);

  const results = data?.results ?? [];
  const simpang = data?.simpang;
  const typing = text.trim().length >= MIN_QUERY_LENGTH;

  const openPlace = (place) => {
    addRecent(query);
    router.push(`/place/${place.id}`);
  };

  const chip = ({ match }) => {
    if (match?.type === 'alias') return t('search.matchedAlias', { alias: match.alias });
    if (match?.type === 'intent') return t('search.matchedNeed', { need: match.need });
    return null;
  };

  const placeRow = (place, index) => (
    <ResultRow
      key={place.id}
      number={index + 1}
      filled={index === 0}
      title={place.name}
      subtitle={placeSubtitle(place)}
      chip={chip(place)}
      distance={formatDistance(place.distance_m)}
      onPress={() => openPlace(place)}
    />
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.surface }]} edges={['top']}>
      <SearchHeader value={text} onChangeText={setText} busy={pending && typing} />

      {results.length > 0 && <ResultsMap places={results} showUser={located} />}

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
        {!typing && recent.length > 0 && (
          <>
            <SectionHeader title={t('search.recent')} />
            {recent.map((item) => (
              <ListRow key={item} Icon={IconClock} title={item} onPress={() => setText(item)} />
            ))}
          </>
        )}

        {!typing && recent.length === 0 && (
          <Text style={[type.small, styles.hint, { color: colors.inkMuted }]}>{t('search.hint')}</Text>
        )}

        {typing && error && !data && (
          <Text style={[type.body, styles.hint, { color: colors.ink }]}>{t('map.offline')}</Text>
        )}

        {typing && data && simpang && (
          <>
            {simpang.roads.length > 1 && !simpang.road && (
              <View style={[styles.banner, { backgroundColor: colors.selected }]}>
                <IconMapPin size={20} strokeWidth={2} color={colors.ink} />
                <Text style={[type.small, styles.bannerText, { color: colors.ink }]}>
                  {t('search.simpangManyRoads', { count: simpang.roads.length, number: simpang.number })}
                </Text>
              </View>
            )}
            {/* Once the road is typed, the road list would only repeat it */}
            {simpang.roads.length > 0 && !simpang.road && (
              <>
                <SectionHeader title={t('search.simpangMatches')} />
                {simpang.roads.map(({ road, place_count: count }) => (
                  <ListRow
                    key={road}
                    Icon={IconRoad}
                    title={t('search.simpangOnRoad', { number: simpang.number, road })}
                    subtitle={t('search.placeCount', { count })}
                    onPress={() => setText(`Simpang ${simpang.number} ${road}`)}
                  />
                ))}
              </>
            )}
            {results.length > 0 && (
              <>
                <SectionHeader title={t('search.placesOnSimpang', { number: simpang.number })} />
                {results.map(placeRow)}
              </>
            )}
          </>
        )}

        {typing && data && !simpang && results.length > 0 && (
          <>
            <SectionHeader title={t('search.bestMatch')} />
            {placeRow(results[0], 0)}
            {results.length > 1 && (
              <>
                <SectionHeader title={t('search.moreResults')} />
                {results.slice(1).map((place, index) => placeRow(place, index + 1))}
              </>
            )}
          </>
        )}

        {typing && data && results.length === 0 && !simpang?.roads.length && (
          <View style={styles.empty}>
            <Text style={[type.h3, { color: colors.ink }]}>{t('search.noResults', { query })}</Text>
            <Text style={[type.small, { color: colors.inkMuted, marginTop: space[1] }]}>{t('search.hint')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { paddingBottom: space[8] },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    margin: space[4],
    marginBottom: 0,
    padding: space[3],
    borderRadius: radius.md,
  },
  bannerText: { flex: 1 },
  hint: { padding: space[4] },
  empty: { padding: space[4] },
});
