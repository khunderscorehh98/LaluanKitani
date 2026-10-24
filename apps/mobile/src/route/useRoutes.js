import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../api/client';

// Rounded so a GPS wobble of a few metres doesn't plan the routes again
const round = (n) => Math.round(n * 10_000) / 10_000;

/** Routes from `from` to `to` ([lng, lat]); with `arriveBy` (Date), planned to arrive on time. */
export function useRoutes(from, to, arriveBy) {
  const params = from &&
    to && {
      from_lat: round(from[1]),
      from_lng: round(from[0]),
      to_lat: round(to[1]),
      to_lng: round(to[0]),
      arrive_by: arriveBy?.toISOString(),
    };
  return useQuery({
    queryKey: ['route', params],
    queryFn: ({ signal }) => apiGet('/v1/route', params, { signal }),
    enabled: Boolean(params),
    // Reports change the route; refresh while the preview is open
    staleTime: 60_000,
    refetchInterval: 120_000,
    placeholderData: (previous) => previous,
  });
}
