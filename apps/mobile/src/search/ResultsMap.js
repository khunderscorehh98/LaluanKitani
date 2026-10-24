// Small map above the search results with a numbered pin per result.
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Camera, GeoJSONSource, Layer, Map, NativeUserLocation } from '../map/components';
import { mapStyle } from '../map/style';
import { useTheme } from '../theme/useTheme';

const PADDING = { top: 40, right: 40, bottom: 24, left: 40 };
const SINGLE_PLACE_ZOOM = 14;

function boundsOf(points) {
  const lngs = points.map(([lng]) => lng);
  const lats = points.map(([, lat]) => lat);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

/** places: [{ id, location: { lat, lng } }] in result order. */
export function ResultsMap({ places, showUser }) {
  const { scheme, colors } = useTheme();
  const camera = useRef(null);
  const points = useMemo(() => places.map((p) => [p.location.lng, p.location.lat]), [places]);

  const pins = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: places.map((place, index) => ({
        type: 'Feature',
        id: place.id,
        geometry: { type: 'Point', coordinates: [place.location.lng, place.location.lat] },
        properties: { number: String(index + 1), best: index === 0 },
      })),
    }),
    [places],
  );

  // Keep every result in view as the results change
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      camera.current?.easeTo({ center: points[0], zoom: SINGLE_PLACE_ZOOM, duration: 400 });
    } else {
      camera.current?.fitBounds(boundsOf(points), { padding: PADDING, duration: 400 });
    }
  }, [points]);

  const initialViewState =
    points.length > 1
      ? { bounds: boundsOf(points), padding: PADDING }
      : { center: points[0], zoom: SINGLE_PLACE_ZOOM };

  return (
    <View style={styles.frame}>
      <Map style={StyleSheet.absoluteFill} mapStyle={mapStyle(scheme)} logo={false} attribution={false} compass={false}>
        <Camera ref={camera} initialViewState={initialViewState} />
        <GeoJSONSource id="search-pins" data={pins}>
          <Layer
            id="search-pins-circle"
            type="circle"
            paint={{
              'circle-radius': 13,
              // Best match is filled teal; the rest are outlined, as in the list
              'circle-color': ['case', ['get', 'best'], colors.primary, colors.surfaceRaised],
              'circle-stroke-color': colors.primary,
              'circle-stroke-width': 2.5,
            }}
          />
          <Layer
            id="search-pins-number"
            type="symbol"
            layout={{
              'text-field': ['get', 'number'],
              'text-font': ['Noto Sans Medium'],
              'text-size': 13,
              'text-allow-overlap': true,
            }}
            paint={{ 'text-color': ['case', ['get', 'best'], colors.onPrimary, colors.tealText] }}
          />
        </GeoJSONSource>
        {showUser && <NativeUserLocation />}
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 200 },
});
