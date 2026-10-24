// Place details for a place in our database: names, Friday prayer status,
// hours, busy times, nearby reports.
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiGet } from '../../api/client';
import { placeSubtitle } from '../../format';
import { useOrigin } from '../../location';
import { PlaceLoading, PlaceView } from '../../place/PlaceView';
import { savedFromPlace } from '../../store/savedPlaces';

export default function PlaceDetails() {
  const { id } = useLocalSearchParams();
  const { i18n } = useTranslation();
  const { origin } = useOrigin();
  const [lng, lat] = origin ?? [];
  const { data: place, error, refetch, isFetching } = useQuery({
    queryKey: ['place', id, i18n.language, lng, lat],
    queryFn: ({ signal }) => apiGet(`/v1/places/${id}`, { lang: i18n.language, lat, lng }, { signal }),
    placeholderData: (previous) => previous,
  });

  if (!place) return <PlaceLoading error={error} onRetry={() => refetch()} retrying={isFetching} />;
  return <PlaceView place={place} saved={savedFromPlace(place, placeSubtitle(place))} />;
}
