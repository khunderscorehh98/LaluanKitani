// Map for the route preview: every route option (selected one on top, in teal),
// a time label on each, start and destination, plus reports and Peak Spots.
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Camera, GeoJSONSource, Layer, Map } from '../map/components';
import { MapLayers } from '../map/MapLayers';
import { mapStyle } from '../map/style';
import { useMapLayers } from '../map/useMapLayers';
import { useTheme } from '../theme/useTheme';

const GREY = { light: '#6B7280', dark: '#9CA3AF' };

function boundsOf(lines) {
  const points = lines.flat();
  const lngs = points.map(([lng]) => lng);
  const lats = points.map(([, lat]) => lat);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

/** padding: screen space taken by the header and bottom sheet, so routes stay visible. */
export function RouteMap({ routes, selected, onSelect, from, to, padding }) {
  const { t } = useTranslation();
  const { scheme, colors } = useTheme();
  const camera = useRef(null);
  const lines = useMemo(() => routes.map((r) => r.geometry.coordinates), [routes]);

  const center = from && to ? [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2] : from;
  const { reports, peakSpots } = useMapLayers(center ?? [114.922, 4.905]);

  const routeFeatures = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: routes.map((route, index) => ({
        type: 'Feature',
        id: index,
        geometry: route.geometry,
        // Drawn in order of sort, so the selected route ends up on top
        properties: { index, selected: index === selected, sort: index === selected ? 1 : 0 },
      })),
    }),
    [routes, selected],
  );

  // A "18 min" label part-way along each route
  const labels = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: routes.map((route, index) => {
        const coords = route.geometry.coordinates;
        const at = coords[Math.floor(coords.length * (index === 0 ? 0.45 : 0.6))];
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: at },
          properties: {
            index,
            selected: index === selected,
            text: t('route.minutes', { count: Math.max(1, Math.round(route.duration_s / 60)) }),
          },
        };
      }),
    }),
    [routes, selected, t],
  );

  const ends = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: [from, to]
        .filter(Boolean)
        .map((point, i) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: point }, properties: { end: i === 1 } })),
    }),
    [from, to],
  );

  const pad = JSON.stringify(padding);
  useEffect(() => {
    if (!lines.length) return;
    camera.current?.fitBounds(boundsOf(lines), { padding: JSON.parse(pad), duration: 500 });
  }, [lines, pad]);

  const pickRoute = (event) => {
    event.stopPropagation?.();
    const index = event.nativeEvent.features[0]?.properties?.index;
    if (index !== undefined) onSelect(Number(index));
  };

  return (
    <Map
      style={StyleSheet.absoluteFill}
      mapStyle={mapStyle(scheme)}
      logo={false}
      compass={false}
      attributionPosition={{ bottom: padding.bottom + 8, right: 8 }}
    >
      <Camera
        ref={camera}
        initialViewState={
          lines.length ? { bounds: boundsOf(lines), padding } : { center: center ?? [114.922, 4.905], zoom: 13 }
        }
      />
      <MapLayers reports={reports} peakSpots={peakSpots} scheme={scheme} />
      <GeoJSONSource id="routes" data={routeFeatures} onPress={pickRoute}>
        <Layer
          id="routes-casing"
          type="line"
          layout={{ 'line-join': 'round', 'line-cap': 'round', 'line-sort-key': ['get', 'sort'] }}
          paint={{ 'line-color': scheme === 'dark' ? '#111827' : '#FFFFFF', 'line-width': 11 }}
        />
        <Layer
          id="routes-line"
          type="line"
          layout={{ 'line-join': 'round', 'line-cap': 'round', 'line-sort-key': ['get', 'sort'] }}
          paint={{
            'line-color': ['case', ['get', 'selected'], colors.primary, GREY[scheme]],
            'line-width': 6,
          }}
        />
      </GeoJSONSource>
      <GeoJSONSource id="route-labels" data={labels} onPress={pickRoute}>
        <Layer
          id="route-labels-text"
          type="symbol"
          layout={{
            'text-field': ['get', 'text'],
            'text-font': ['Noto Sans Medium'],
            'text-size': 13,
            'text-allow-overlap': true,
            'text-ignore-placement': true,
          }}
          paint={{
            'text-color': ['case', ['get', 'selected'], '#FFFFFF', colors.ink],
            'text-halo-color': ['case', ['get', 'selected'], colors.primary, colors.surfaceRaised],
            'text-halo-width': 6,
          }}
        />
      </GeoJSONSource>
      <GeoJSONSource id="route-ends" data={ends}>
        <Layer
          id="route-ends-dot"
          type="circle"
          paint={{
            'circle-radius': ['case', ['get', 'end'], 9, 7],
            'circle-color': ['case', ['get', 'end'], colors.surfaceRaised, colors.primary],
            'circle-stroke-color': ['case', ['get', 'end'], colors.primary, '#FFFFFF'],
            'circle-stroke-width': 3,
          }}
        />
      </GeoJSONSource>
    </Map>
  );
}
