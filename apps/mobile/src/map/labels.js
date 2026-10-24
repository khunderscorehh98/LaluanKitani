// Labels on the base map (shops, restaurants, schools... from OpenStreetMap,
// drawn by the Protomaps "pois" layer). Tapping one looks for the same place
// in our database first; if we don't have it, the label's own data is used.
import { apiGet } from '../api/client';

const LABEL_LAYERS = ['pois'];
// Finger-sized area around the tap, in screen points
const HITBOX = 16;

/**
 * The label under a map tap, or null. `map` is a ref to <Map>, `event` its onPress event.
 * Returns { name, kind, lngLat: [lng, lat] }.
 */
export async function labelAt(map, event) {
  const [x, y] = event.nativeEvent.point;
  const features = await map.current?.queryRenderedFeatures(
    [
      [x - HITBOX, y - HITBOX],
      [x + HITBOX, y + HITBOX],
    ],
    { layers: LABEL_LAYERS },
  );
  const feature = features?.find((f) => f.properties?.name && f.geometry?.type === 'Point');
  if (!feature) return null;
  const { properties } = feature;
  return {
    // The map shows English names where OSM has them, else the local name
    name: properties['name:en'] ?? properties.name,
    localName: properties.name,
    kind: properties.kind_detail || properties.kind || null,
    lngLat: feature.geometry.coordinates,
  };
}

/** Our place behind a label (full details available), or null. */
export async function placeForLabel(label, lang) {
  const [lng, lat] = label.lngLat;
  const res = await apiGet('/v1/places/at-label', { lat, lng, name: label.localName, lang });
  return res.place;
}
