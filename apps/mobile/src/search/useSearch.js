import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiGet } from '../api/client';

// The API needs at least 2 characters
export const MIN_QUERY_LENGTH = 2;
const TYPING_PAUSE_MS = 300;

function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * Search places once the driver pauses typing. `origin` ([lng, lat] or null)
 * sorts results by distance and fills in distance_m.
 */
export function useSearch(text, origin) {
  const { i18n } = useTranslation();
  const q = useDebounced(text.trim(), TYPING_PAUSE_MS);
  const [lng, lat] = origin ?? [];

  const search = useQuery({
    queryKey: ['search', q, i18n.language, lng, lat],
    queryFn: ({ signal }) =>
      apiGet('/v1/places/search', { q, lat, lng, lang: i18n.language, limit: 10 }, { signal }),
    enabled: q.length >= MIN_QUERY_LENGTH,
    placeholderData: (previous) => previous,
    staleTime: 5 * 60_000,
  });

  return {
    query: q,
    data: q.length >= MIN_QUERY_LENGTH ? search.data : undefined,
    // Still typing, or waiting for the answer to what was typed
    pending: text.trim() !== q || search.isFetching,
    error: search.error,
  };
}
