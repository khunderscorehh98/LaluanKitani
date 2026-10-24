// Base map style: Protomaps layers over our Brunei PMTiles file.
import { layers, namedFlavor } from '@protomaps/basemaps';
import { TILES_URL } from '../config';

// Fonts and icons for map labels. Hosted by Protomaps for now; to be served
// from our own tile server before launch so map loading stays in Brunei.
const ASSETS = 'https://protomaps.github.io/basemaps-assets';

// Gadong and Kiulap: where the map opens when the phone's location is unknown
export const DEFAULT_CENTER = [114.922, 4.905];

// Place labels (shops, cafés, schools...). Protomaps draws them at 10 px below
// zoom 17 with a background-coloured halo, so they sink into the map. Ours are
// bigger, medium weight, deeper in colour, with a crisp halo. The colours stay
// clear of the reserved report colours (yellow, orange, red, blue, black).
const POI_COLORS = {
  light: { nature: '#15803D', transport: '#3730A3', civic: '#5B21B6', shop: '#0E7490', food: '#9A3412', culture: '#BE185D', other: '#374151', halo: '#FFFFFF' },
  dark: { nature: '#4ADE80', transport: '#A5B4FC', civic: '#C4B5FD', shop: '#67E8F9', food: '#FDBA74', culture: '#F9A8D4', other: '#E5E7EB', halo: '#111827' },
};

const POI_KINDS = {
  nature: ['beach', 'forest', 'marina', 'park', 'peak', 'zoo', 'garden', 'bench'],
  transport: ['aerodrome', 'station', 'bus_stop', 'ferry_terminal'],
  civic: ['stadium', 'university', 'library', 'school', 'animal', 'toilets', 'drinking_water', 'post_office', 'building', 'townhall'],
  shop: ['supermarket', 'convenience', 'books', 'beauty', 'electronics', 'clothes'],
  food: ['restaurant', 'fast_food', 'cafe', 'bar'],
  culture: ['attraction', 'museum', 'theatre', 'artwork'],
};

function clearerPois(layer, scheme) {
  const c = POI_COLORS[scheme];
  const color = ['case'];
  for (const [group, kinds] of Object.entries(POI_KINDS)) {
    color.push(['in', ['get', 'kind'], ['literal', kinds]], c[group]);
  }
  color.push(c.other);
  return {
    ...layer,
    layout: {
      ...layer.layout,
      'text-font': ['Noto Sans Medium'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 14, 12, 16, 13.5, 18, 16],
      'icon-size': ['interpolate', ['linear'], ['zoom'], 14, 1, 17, 1.2],
    },
    paint: {
      ...layer.paint,
      'text-color': color,
      'text-halo-color': c.halo,
      'text-halo-width': 1.8,
      'text-halo-blur': 0.3,
    },
  };
}

const styles = {};

/** Style JSON for 'light' or 'dark'. Built once per scheme. */
export function mapStyle(scheme) {
  styles[scheme] ??= {
    version: 8,
    glyphs: `${ASSETS}/fonts/{fontstack}/{range}.pbf`,
    sprite: `${ASSETS}/sprites/v4/${scheme}`,
    sources: {
      protomaps: {
        type: 'vector',
        url: `pmtiles://${TILES_URL}`,
        attribution: '© OpenStreetMap contributors',
      },
    },
    // Protomaps has no Malay label set. With 'en', labels fall back to the
    // local OSM name, which in Brunei is the Malay name people use.
    layers: layers('protomaps', namedFlavor(scheme), { lang: 'en' }).map((layer) =>
      layer.id === 'pois' ? clearerPois(layer, scheme) : layer,
    ),
  };
  return styles[scheme];
}
