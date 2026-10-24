// Web map engine: the same component API as MapLibre React Native (the parts
// this app uses), drawn by MapLibre GL JS in a WebView. Used in Expo Go.
// Children render nothing themselves; they describe sources, layers and images,
// and <Map> sends those descriptions to the page (see page.js).
import { createContext, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { useTheme } from '../../theme/useTheme';
import { space, type } from '../../theme/tokens';
import { mapPage } from './page';

const MapContext = createContext(null);
const SourceContext = createContext(null);

const useMap = () => {
  const map = useContext(MapContext);
  if (!map) throw new Error('Map components must be inside <Map>');
  return map;
};

export function Map({
  style,
  mapStyle,
  attribution = true,
  attributionPosition,
  compass = false,
  compassPosition,
  dragPan = true,
  touchZoom = true,
  touchRotate = true,
  touchPitch = true,
  doubleTapZoom = true,
  onRegionDidChange,
  onPress,
  ref,
  children,
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const webView = useRef(null);
  const ready = useRef(false);
  const queue = useRef([]);
  const pressHandlers = useRef({});
  const order = useRef(0);
  const latest = useRef({});
  const queries = useRef({ next: 0, pending: {} });
  const [failed, setFailed] = useState(false);
  latest.current = { mapStyle, onRegionDidChange, onPress };

  // The page HTML is fixed for this map; changes go through messages
  const [html] = useState(() => mapPage(colors.surface));

  const context = useMemo(() => {
    const send = (msg) => {
      if (!ready.current) {
        queue.current.push(msg);
        return;
      }
      webView.current?.injectJavaScript(`window.__lk && window.__lk.receive(${JSON.stringify(msg)}); true;`);
    };
    return {
      send,
      nextOrder: () => (order.current += 1),
      setPressHandler: (id, handler) => {
        pressHandlers.current[id] = handler;
      },
    };
  }, []);

  const options = {
    style: mapStyle,
    attribution,
    attributionPosition,
    compass,
    compassPosition,
    userColor: colors.primary,
    gestures: { dragPan, touchZoom, touchRotate, touchPitch, doubleTapZoom },
  };
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Like the native MapRef: queryRenderedFeatures(point | bounds, { layers, filter })
  useImperativeHandle(
    ref,
    () => ({
      queryRenderedFeatures: (where, queryOptions = {}) =>
        new Promise((resolve) => {
          const id = (queries.current.next += 1);
          queries.current.pending[id] = resolve;
          context.send({ type: 'query', id, where, options: queryOptions });
          // Never leave a caller waiting if the page doesn't answer
          setTimeout(() => {
            if (queries.current.pending[id]) {
              delete queries.current.pending[id];
              resolve([]);
            }
          }, 3000);
        }),
    }),
    [context],
  );

  // A new style (light/dark switch) replaces the base map; our layers are re-added
  const sentStyle = useRef(mapStyle);
  useEffect(() => {
    if (sentStyle.current === mapStyle) return;
    sentStyle.current = mapStyle;
    context.send({ type: 'style', style: mapStyle });
  }, [mapStyle, context]);

  const onMessage = (event) => {
    const msg = JSON.parse(event.nativeEvent.data);    switch (msg.type) {
      case 'ready': {
        ready.current = true;
        context.send({ type: 'init', options: optionsRef.current });
        sentStyle.current = optionsRef.current.style;
        const pending = queue.current;
        queue.current = [];
        pending.forEach(context.send);
        break;
      }
      case 'regionDidChange': {
        const { type: _type, ...state } = msg;
        latest.current.onRegionDidChange?.({ nativeEvent: state });
        break;
      }
      case 'press':
        pressHandlers.current[msg.sourceId]?.({ nativeEvent: { features: msg.features } });
        break;
      case 'mapPress':
        latest.current.onPress?.({ nativeEvent: { lngLat: msg.lngLat, point: msg.point } });
        break;
      case 'queryResult': {
        const resolve = queries.current.pending[msg.id];
        delete queries.current.pending[msg.id];
        resolve?.(msg.features);
        break;
      }
      case 'fatal':
        setFailed(true);
        break;
      case 'error':
        if (__DEV__) console.warn('[web map]', msg.message);
        break;
    }
  };

  return (
    <View style={[styles.map, style]}>
      <WebView
        ref={webView}
        source={{ html }}
        originWhitelist={['*']}
        onMessage={onMessage}
        javaScriptEnabled
        // Tiles come from the local tile server over http during development
        mixedContentMode="always"
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]}
      />
      {failed && (
        <View style={[styles.failed, { backgroundColor: colors.surface }]}>
          <Text style={[type.small, { color: colors.inkMuted, textAlign: 'center' }]}>{t('map.webOffline')}</Text>
        </View>
      )}
      <MapContext.Provider value={context}>{children}</MapContext.Provider>
    </View>
  );
}

export function Camera({ ref, initialViewState, minZoom, maxZoom, maxBounds }) {
  const map = useMap();

  useImperativeHandle(
    ref,
    () => ({
      jumpTo: (options) => map.send({ type: 'camera', method: 'jumpTo', options }),
      easeTo: (options) => map.send({ type: 'camera', method: 'easeTo', options }),
      flyTo: (options) => map.send({ type: 'camera', method: 'flyTo', options }),
      fitBounds: (bounds, options) => map.send({ type: 'camera', method: 'fitBounds', bounds, options }),
      zoomTo: (zoom, options) => map.send({ type: 'camera', method: 'zoomTo', zoom, options }),
    }),
    [map],
  );

  const limits = JSON.stringify({ minZoom, maxZoom, maxBounds });
  useEffect(() => {
    map.send({ type: 'limits', ...JSON.parse(limits) });
  }, [limits, map]);

  // Like the native Camera: the initial view applies once, when it mounts
  useEffect(() => {
    if (initialViewState) map.send({ type: 'camera', method: 'view', options: initialViewState });
  }, []);

  return null;
}

export function GeoJSONSource({ id, data, onPress, children }) {
  const map = useMap();
  const json = JSON.stringify(data);

  useEffect(() => {
    map.send({ type: 'source', id, data: JSON.parse(json) });
  }, [id, json, map]);
  useEffect(() => () => map.send({ type: 'removeSource', id }), [id, map]);

  map.setPressHandler(id, onPress);
  const pressable = Boolean(onPress);
  useEffect(() => {
    map.send({ type: 'pressable', id, on: pressable });
  }, [id, pressable, map]);

  return <SourceContext.Provider value={id}>{children}</SourceContext.Provider>;
}

export function Layer({ id, source, ...spec }) {
  const map = useMap();
  const parentSource = useContext(SourceContext);
  // Render order decides stacking, as with the native engine
  const [order] = useState(() => map.nextOrder());
  const json = JSON.stringify({ id, source: source ?? parentSource, ...spec });

  useEffect(() => {
    map.send({ type: 'layer', spec: JSON.parse(json), order });
  }, [json, order, map]);
  useEffect(() => () => map.send({ type: 'removeLayer', id }), [id, map]);

  return null;
}

// Metro's asset server sends no CORS headers, so the page can't load asset
// URLs into WebGL. The app fetches them instead (no CORS in React Native) and
// hands the page data: URLs. Cached, as the same badges are used by every map.
const dataUrls = {};

function toDataUrl(uri) {
  dataUrls[uri] ??= fetch(uri)
    .then((response) => response.blob())
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }),
    );
  return dataUrls[uri];
}

/** images: { name: require('./x.png') | { source: require(...) } }. */
export function Images({ images }) {
  const map = useMap();
  const resolved = JSON.stringify(
    Object.entries(images).map(([name, entry]) => {
      const asset = Image.resolveAssetSource(entry?.source ?? entry);
      return [name, asset.uri, asset.scale ?? 1];
    }),
  );
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      JSON.parse(resolved).map(async ([name, uri, scale]) => [name, { uri: await toDataUrl(uri), scale }]),
    )
      .then((entries) => {
        if (!cancelled) map.send({ type: 'images', images: Object.fromEntries(entries) });
      })
      .catch((err) => __DEV__ && console.warn('[web map] images:', err.message));
    return () => {
      cancelled = true;
    };
  }, [resolved, map]);
  return null;
}

/** Blue-dot equivalent: follows the phone's position (location permission must be granted). */
export function NativeUserLocation() {
  const map = useMap();
  useEffect(() => {
    let subscription = null;
    let stopped = false;
    Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 5 }, (position) =>
      map.send({ type: 'user', position: [position.coords.longitude, position.coords.latitude] }),
    )
      .then((sub) => {
        if (stopped) sub.remove();
        else subscription = sub;
      })
      .catch(() => {});
    return () => {
      stopped = true;
      subscription?.remove();
      map.send({ type: 'user', position: null });
    };
  }, [map]);
  return null;
}

const styles = StyleSheet.create({
  map: { flex: 1, overflow: 'hidden' },
  failed: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: space[4] },
});
