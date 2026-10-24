// Live reports and Peak Spots around the map centre, as GeoJSON for MapLibre.
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../api/client';
import { clock } from '../format';

const REPORTS_RADIUS_M = 5_000;
const PEAK_SPOTS_RADIUS_M = 10_000;
// Refresh while the map is open: reports come and go within the hour
const REFRESH_MS = 60_000;

// Round the centre to about 1 km so small pans reuse the cached answer
const roundCenter = ([lng, lat]) => [Math.round(lng * 100) / 100, Math.round(lat * 100) / 100];

const featureCollection = (features) => ({ type: 'FeatureCollection', features });

/**
 * The window worth showing on the map: the one happening now, else the next
 * one today, else the first. Uses the phone's clock, which is Brunei time.
 */
function relevantWindow(windows, now = new Date()) {
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return windows.find((w) => w.ends > time) ?? windows[0];
}

function reportsToGeoJSON({ reports }) {
  return featureCollection(
    reports.map((report) => ({
      type: 'Feature',
      id: report.id,
      geometry: { type: 'Point', coordinates: [report.location.lng, report.location.lat] },
      properties: { id: report.id, label: report.label, confirmed: report.confirmed },
    })),
  );
}

function peakSpotsToGeoJSON({ peak_spots: spots }) {
  return featureCollection(
    spots.map((spot) => {
      const window = relevantWindow(spot.windows);
      return {
        type: 'Feature',
        id: spot.id,
        geometry: spot.geometry,
        properties: {
          id: spot.id,
          name: spot.name,
          active: spot.active,
          window: window ? `${clock(window.starts)}-${clock(window.ends)}` : '',
        },
      };
    }),
  );
}

export function useMapLayers(center) {
  const [lng, lat] = roundCenter(center);

  const reports = useQuery({
    queryKey: ['reports', lng, lat],
    queryFn: ({ signal }) => apiGet('/v1/reports', { lat, lng, radius: REPORTS_RADIUS_M }, { signal }),
    select: reportsToGeoJSON,
    refetchInterval: REFRESH_MS,
    placeholderData: (previous) => previous,
  });

  const peakSpots = useQuery({
    queryKey: ['peak-spots', lng, lat],
    queryFn: ({ signal }) => apiGet('/v1/peak-spots', { lat, lng, radius: PEAK_SPOTS_RADIUS_M }, { signal }),
    select: peakSpotsToGeoJSON,
    refetchInterval: REFRESH_MS,
    placeholderData: (previous) => previous,
  });

  return {
    reports: reports.data ?? featureCollection([]),
    peakSpots: peakSpots.data ?? featureCollection([]),
    error: reports.error ?? peakSpots.error,
  };
}
