// The place page for a spot that isn't in our database: a label tapped on the
// map, or a saved pin (a house, say). Same layout as any place; what we don't
// know (hours, local names) is shown as not known, never guessed.
// /spot?lat=&lng=&name=&category=
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiGet } from '../api/client';
import { categoryLabel } from '../format';
import { useOrigin } from '../location';
import { distance } from '../navigation/geo';
import { PlaceView } from '../place/PlaceView';
import { savedFromPin } from '../store/savedPlaces';

// The same areas the API uses for a place's nearby reports and busy times
const NEARBY_REPORTS_RADIUS_M = 500;
const BUSY_TIMES_RADIUS_M = 1000;

export default function Spot() {
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const { origin } = useOrigin();
  const location = { lat: Number(params.lat), lng: Number(params.lng) };
  const here = [location.lng, location.lat];

  const around = (path, radius) => ({
    queryKey: [path, location.lat, location.lng, radius],
    queryFn: ({ signal }) => apiGet(path, { lat: location.lat, lng: location.lng, radius }, { signal }),
  });
  const reports = useQuery(around('/v1/reports', NEARBY_REPORTS_RADIUS_M));
  const peakSpots = useQuery(around('/v1/peak-spots', BUSY_TIMES_RADIUS_M));

  const place = {
    name: params.name || t('spot.unnamed'),
    category: params.category || null,
    location,
    distance_m: origin ? Math.round(distance(origin, here)) : null,
    status: { state: 'hours_not_confirmed' },
    hours: null,
    // Unknown whether it is a business, so no Friday prayer closure is assumed
    friday_prayer_closure: false,
    busy_times: peakSpots.data?.peak_spots ?? [],
    nearby_reports: reports.data?.reports ?? [],
    address: null,
    also_known_as: [],
    last_verified_at: null,
  };

  return (
    <PlaceView
      place={place}
      saved={{ ...savedFromPin(location, place.name), category: place.category, detail: categoryLabel(place.category) }}
      notice={t('spot.notice')}
    />
  );
}
