// HTML for the WebView map engine. Runs MapLibre GL JS with the PMTiles
// protocol, and applies the sources, layers, images and camera moves that the
// React components send (see WebMap.js). Sends back moves and taps.
//
// Libraries load from unpkg, pinned. This engine is only for Expo Go during
// development, so needing the internet here is acceptable.
const MAPLIBRE = 'https://unpkg.com/maplibre-gl@5.24.0/dist';
const PMTILES = 'https://unpkg.com/pmtiles@4.5.0/dist/pmtiles.js';

// Plain browser JavaScript (no build step), kept ES2017 for older WebViews
const script = `
(function () {
  var post = function (msg) { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); };
  window.onerror = function (message) { post({ type: 'error', message: String(message) }); };
  if (typeof maplibregl === 'undefined' || typeof pmtiles === 'undefined') {
    post({ type: 'fatal', message: 'Map libraries could not be loaded' });
    return;
  }
  maplibregl.addProtocol('pmtiles', new pmtiles.Protocol().tile);

  var map = null;
  var styleReady = false;
  var userColor = '#0F766E';
  // What the app wants on the map. apply() makes the map match it.
  var want = { sources: {}, layers: {}, images: {}, pressable: {}, user: null };
  var dirtySources = {};
  var dirtyLayers = {};
  var removeLayers = {};
  var removeSources = {};
  var imageData = {};
  var imageLoading = {};
  var pendingCamera = [];

  function corner(pos, fallback) {
    if (!pos) return fallback;
    return (pos.bottom !== undefined ? 'bottom' : 'top') + '-' + (pos.left !== undefined ? 'left' : 'right');
  }

  // Adds a control in the corner named by a { top|bottom, left|right } position,
  // offset by those values like the native map. The first control in a corner sets its offset.
  var placedCorners = {};
  function placeControl(control, pos, fallback) {
    var where = corner(pos, fallback);
    map.addControl(control, where);
    if (!pos || placedCorners[where]) return;
    placedCorners[where] = true;
    var el = document.querySelector('.maplibregl-ctrl-' + where);
    ['top', 'right', 'bottom', 'left'].forEach(function (side) {
      if (pos[side] !== undefined) el.style['margin' + side[0].toUpperCase() + side.slice(1)] = pos[side] + 'px';
    });
  }

  function create(opts) {
    userColor = opts.userColor || userColor;
    map = new maplibregl.Map({
      container: 'map',
      style: opts.style,
      center: [114.922, 4.905],
      zoom: 14,
      attributionControl: false,
      interactive: opts.interactive !== false,
    });
    if (opts.attribution !== false) {
      placeControl(new maplibregl.AttributionControl({ compact: true }), opts.attributionPosition, 'bottom-right');
      // Start as the (i) button, like the native map; tap to read the credit
      map.on('load', function () {
        var attrib = document.querySelector('.maplibregl-ctrl-attrib');
        if (attrib) attrib.classList.remove('maplibregl-compact-show');
      });
    }
    if (opts.compass) {
      placeControl(new maplibregl.NavigationControl({ showZoom: false }), opts.compassPosition, 'top-right');
    }
    var g = opts.gestures || {};
    if (g.dragPan === false) map.dragPan.disable();
    if (g.touchZoom === false) { map.touchZoomRotate.disable(); map.scrollZoom.disable(); }
    if (g.touchRotate === false) { map.touchZoomRotate.disableRotation(); map.dragRotate.disable(); }
    if (g.touchPitch === false) map.touchPitch.disable();
    if (g.doubleTapZoom === false) map.doubleClickZoom.disable();

    map.on('style.load', function () { styleReady = true; apply(); });
    map.on('moveend', function (e) {
      var c = map.getCenter();
      var b = map.getBounds();
      post({
        type: 'regionDidChange',
        center: [c.lng, c.lat],
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
        bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
        userInteraction: Boolean(e.originalEvent),
      });
    });
    map.on('click', onClick);
    // Camera moves and limits sent before the map existed
    pendingCamera.forEach(function (cmd) {
      if (cmd.method === 'limits') setLimits(cmd.limits);
      else runCamera(cmd);
    });
    pendingCamera = [];
  }

  function onClick(e) {
    // Topmost pressable source first, with a finger-sized hitbox
    var box = [[e.point.x - 22, e.point.y - 22], [e.point.x + 22, e.point.y + 22]];
    var ordered = sortedLayers().reverse();
    var tried = {};
    for (var i = 0; i < ordered.length; i++) {
      var sourceId = ordered[i].spec.source;
      if (!want.pressable[sourceId] || tried[sourceId]) continue;
      tried[sourceId] = true;
      var layerIds = ordered.filter(function (l) { return l.spec.source === sourceId && map.getLayer(l.spec.id); })
        .map(function (l) { return l.spec.id; });
      if (!layerIds.length) continue;
      var features = map.queryRenderedFeatures(box, { layers: layerIds });
      if (features.length) {
        post({ type: 'press', sourceId: sourceId, features: features.map(plainFeature) });
        return;
      }
    }
    // Nothing of ours was tapped: a plain map tap, like the native Map's onPress
    post({ type: 'mapPress', lngLat: [e.lngLat.lng, e.lngLat.lat], point: [e.point.x, e.point.y] });
  }

  function plainFeature(f) {
    return { type: 'Feature', id: f.id, geometry: f.geometry, properties: f.properties };
  }

  // Same arguments as the native MapRef.queryRenderedFeatures: a point [x, y] or
  // bounds [[left, top], [right, bottom]] (MapLibre GL JS takes both as-is), and { layers, filter }
  function queryFeatures(msg) {
    var where = msg.where;
    var options = {};
    if (msg.options && msg.options.layers) {
      options.layers = msg.options.layers.filter(function (id) { return map.getLayer(id); });
    }
    if (msg.options && msg.options.filter) options.filter = msg.options.filter;
    var features = map && styleReady ? map.queryRenderedFeatures(where, options).map(plainFeature) : [];
    post({ type: 'queryResult', id: msg.id, features: features });
  }

  function runCamera(cmd) {
    if (!map) { pendingCamera.push(cmd); return; }
    var o = cmd.options || {};
    var view = { center: o.center, zoom: o.zoom, bearing: o.bearing, pitch: o.pitch, padding: o.padding };
    Object.keys(view).forEach(function (k) { if (view[k] === undefined) delete view[k]; });
    if (cmd.method === 'view') {
      if (o.bounds) map.fitBounds([[o.bounds[0], o.bounds[1]], [o.bounds[2], o.bounds[3]]], { padding: o.padding || 0, duration: 0 });
      else map.jumpTo(view);
    } else if (cmd.method === 'fitBounds') {
      var b = cmd.bounds;
      map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: o.padding || 0, duration: o.duration === undefined ? 500 : o.duration });
    } else if (cmd.method === 'jumpTo') {
      map.jumpTo(view);
    } else if (cmd.method === 'easeTo' || cmd.method === 'flyTo') {
      view.duration = o.duration === undefined ? (cmd.method === 'flyTo' ? 2000 : 500) : o.duration;
      map[cmd.method](view);
    } else if (cmd.method === 'zoomTo') {
      map.zoomTo(cmd.zoom, { duration: o.duration === undefined ? 500 : o.duration });
    }
  }

  function setLimits(l) {
    if (!map) { pendingCamera.push({ method: 'limits', limits: l }); return; }
    if (l.minZoom !== undefined) map.setMinZoom(l.minZoom);
    if (l.maxZoom !== undefined) map.setMaxZoom(l.maxZoom);
    if (l.maxBounds) map.setMaxBounds([[l.maxBounds[0], l.maxBounds[1]], [l.maxBounds[2], l.maxBounds[3]]]);
  }

  function sortedLayers() {
    return Object.keys(want.layers).map(function (id) { return want.layers[id]; })
      .sort(function (a, b) { return a.order - b.order; });
  }

  function addImage(name) {
    var img = want.images[name];
    if (imageData[name]) {
      if (!map.hasImage(name)) map.addImage(name, imageData[name], { pixelRatio: img.scale || 1 });
      return;
    }
    if (imageLoading[name]) return;
    imageLoading[name] = true;
    map.loadImage(img.uri).then(function (res) {
      imageData[name] = res.data;
      imageLoading[name] = false;
      if (map.hasImage(name)) map.removeImage(name);
      map.addImage(name, res.data, { pixelRatio: img.scale || 1 });
    }).catch(function (err) {
      imageLoading[name] = false;
      post({ type: 'error', message: 'image ' + name + ': ' + err.message });
    });
  }

  function apply() {
    if (!map || !styleReady) return;
    Object.keys(removeLayers).forEach(function (id) { if (map.getLayer(id)) map.removeLayer(id); });
    removeLayers = {};
    Object.keys(removeSources).forEach(function (id) {
      map.getStyle().layers.forEach(function (l) { if (l.source === id) map.removeLayer(l.id); });
      if (map.getSource(id)) map.removeSource(id);
    });
    removeSources = {};

    Object.keys(want.images).forEach(function (name) { if (!map.hasImage(name)) addImage(name); });

    Object.keys(want.sources).forEach(function (id) {
      var source = map.getSource(id);
      if (!source) map.addSource(id, { type: 'geojson', data: want.sources[id] });
      else if (dirtySources[id]) source.setData(want.sources[id]);
    });
    dirtySources = {};

    var layers = sortedLayers();
    layers.forEach(function (l) {
      var spec = l.spec;
      if (!map.getSource(spec.source)) return; // its source arrives in a later message
      if (dirtyLayers[spec.id] && map.getLayer(spec.id)) map.removeLayer(spec.id);
      if (!map.getLayer(spec.id)) {
        try { map.addLayer(spec); } catch (err) { post({ type: 'error', message: 'layer ' + spec.id + ': ' + err.message }); }
      }
      delete dirtyLayers[spec.id];
    });
    // Our layers stay above the base map, in the order the components were rendered
    layers.forEach(function (l) { if (map.getLayer(l.spec.id)) map.moveLayer(l.spec.id); });

    applyUser();
  }

  function applyUser() {
    var data = { type: 'FeatureCollection', features: want.user
      ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: want.user }, properties: {} }] : [] };
    var source = map.getSource('__user');
    if (source) { source.setData(data); return; }
    map.addSource('__user', { type: 'geojson', data: data });
    map.addLayer({ id: '__user-halo', type: 'circle', source: '__user',
      paint: { 'circle-radius': 18, 'circle-color': userColor, 'circle-opacity': 0.18 } });
    map.addLayer({ id: '__user-dot', type: 'circle', source: '__user',
      paint: { 'circle-radius': 7, 'circle-color': userColor, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 3 } });
  }

  window.__lk = {
    receive: function (msg) {
      switch (msg.type) {
        case 'init': create(msg.options); return;
        case 'style':
          if (!map) return;
          styleReady = false;
          map.setStyle(msg.style, { diff: false });
          return;
        case 'camera': runCamera(msg); return;
        case 'query': queryFeatures(msg); return;
        case 'limits': setLimits(msg); return;
        case 'source': want.sources[msg.id] = msg.data; dirtySources[msg.id] = true; delete removeSources[msg.id]; break;
        case 'removeSource': delete want.sources[msg.id]; removeSources[msg.id] = true; break;
        case 'layer': want.layers[msg.spec.id] = { spec: msg.spec, order: msg.order }; dirtyLayers[msg.spec.id] = true; delete removeLayers[msg.spec.id]; break;
        case 'removeLayer': delete want.layers[msg.id]; removeLayers[msg.id] = true; break;
        case 'images': Object.keys(msg.images).forEach(function (n) { want.images[n] = msg.images[n]; }); break;
        case 'pressable': want.pressable[msg.id] = msg.on; return;
        case 'user': want.user = msg.position; break;
      }
      apply();
    },
  };
  post({ type: 'ready' });
})();
`;

/** The page, with `background` behind the map while tiles load. */
export function mapPage(background) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="${MAPLIBRE}/maplibre-gl.css">
<style>
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: ${background}; }
  .maplibregl-ctrl-attrib { font: 12px sans-serif; }
</style>
</head>
<body>
<div id="map"></div>
<script src="${MAPLIBRE}/maplibre-gl.js"></script>
<script src="${PMTILES}"></script>
<script>${script}</script>
</body>
</html>`;
}
