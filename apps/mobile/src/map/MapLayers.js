// Laluan Kitani's own map layers: Peak Spot zones and live report badges.
// Report colours are reserved for these layers (brand rule).
import { GeoJSONSource, Images, Layer } from '@maplibre/maplibre-react-native';
import { useTranslation } from 'react-i18next';
import { PEAK_SPOT_BADGE, REPORT_BADGES } from '../reports';
import { reportColors } from '../theme/tokens';

// Map image names: 'report-<label>' and 'report-peak-spot'
const badges = {
  ...Object.fromEntries(Object.entries(REPORT_BADGES).map(([label, image]) => [`report-${label}`, image])),
  'report-peak-spot': PEAK_SPOT_BADGE,
};

// Map labels use the Protomaps font set, not Manrope
const LABEL_FONT = ['Noto Sans Medium'];

export function MapLayers({ reports, peakSpots, scheme, onReportPress }) {
  const { t } = useTranslation();

  return (
    <>
      <Images images={badges} />

      <GeoJSONSource id="peak-spots" data={peakSpots}>
        <Layer
          id="peak-spots-fill"
          type="fill"
          paint={{
            'fill-color': reportColors.jammed,
            // Stronger while the zone is busy right now
            'fill-opacity': ['case', ['get', 'active'], 0.32, scheme === 'dark' ? 0.22 : 0.16],
          }}
        />
        <Layer
          id="peak-spots-outline"
          type="line"
          paint={{ 'line-color': reportColors.jammed, 'line-width': 1.5 }}
        />
        <Layer
          id="peak-spots-badge"
          type="symbol"
          layout={{
            'icon-image': 'report-peak-spot',
            'icon-allow-overlap': true,
            'text-field': ['concat', t('map.peakSpot'), ' · ', ['get', 'window']],
            'text-font': LABEL_FONT,
            'text-size': 12,
            'text-max-width': 20,
            'text-anchor': 'bottom',
            'text-offset': [0, -1.6],
            'text-optional': true,
          }}
          paint={{
            'text-color': scheme === 'dark' ? '#F9FAFB' : '#1F2937',
            'text-halo-color': scheme === 'dark' ? '#1F2937' : '#FFFFFF',
            'text-halo-width': 2,
          }}
        />
      </GeoJSONSource>

      <GeoJSONSource
        id="reports"
        data={reports}
        onPress={(event) => {
          const id = event.nativeEvent.features[0]?.properties?.id;
          if (id) onReportPress?.(id);
        }}
      >
        <Layer
          id="reports-badge"
          type="symbol"
          layout={{
            'icon-image': ['concat', 'report-', ['get', 'label']],
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
          }}
        />
      </GeoJSONSource>
    </>
  );
}
