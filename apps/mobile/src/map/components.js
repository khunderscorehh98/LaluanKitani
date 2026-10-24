// The app's map components: <Map>, <Camera>, <GeoJSONSource>, <Layer>,
// <Images>, <NativeUserLocation>. Screens import them from here, never from
// '@maplibre/maplibre-react-native' directly.
//
// Two engines with the same API:
// - native: MapLibre React Native. Development and store builds. Fast; used for driving.
// - web:    MapLibre GL JS in a WebView. Used where the native module is missing,
//           i.e. Expo Go, so the app can be tried on any phone without a build.
//           Same style, same Brunei tiles, same layers.
import { TurboModuleRegistry } from 'react-native';

/** True when this app binary includes MapLibre's native code. */
export const hasNativeMap = TurboModuleRegistry.get('MLRNCameraModule') != null;

if (__DEV__) console.info(`[map] engine: ${hasNativeMap ? 'native MapLibre' : 'web (MapLibre GL JS in a WebView)'}`);

// require, not import: importing MapLibre RN without its native code throws at load time
const engine = hasNativeMap ? require('@maplibre/maplibre-react-native') : require('./web');

export const { Map, Camera, GeoJSONSource, Layer, Images, NativeUserLocation } = engine;
