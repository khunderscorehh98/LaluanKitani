// Base map style: Protomaps layers over our Brunei PMTiles file.
import { layers, namedFlavor } from '@protomaps/basemaps';
import { TILES_URL } from '../config';

// Fonts and icons for map labels. Hosted by Protomaps for now; to be served
// from our own tile server before launch so map loading stays in Brunei.
const ASSETS = 'https://protomaps.github.io/basemaps-assets';

// Gadong and Kiulap: where the map opens when the phone's location is unknown
export const DEFAULT_CENTER = [114.922, 4.905];

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
    layers: layers('protomaps', namedFlavor(scheme), { lang: 'en' }),
  };
  return styles[scheme];
}
