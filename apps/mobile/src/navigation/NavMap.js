// Driving view: the camera follows from behind the driver, tilted, turned to
// the road ahead, with the driver low on the screen so they see what's coming.
// Panning the map stops following until they tap Re-centre.
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Camera, GeoJSONSource, Images, Layer, Map } from '../map/components';
import { MapLayers } from '../map/MapLayers';
import { mapStyle } from '../map/style';
import { useMapLayers } from '../map/useMapLayers';
import { useTheme } from '../theme/useTheme';
import { smoothBearing, splitAt } from './geo';

const PITCH = 55;
// Closer in town, further out at highway speed (m/s)
const zoomFor = (speed) => (speed > 20 ? 15.8 : speed > 12 ? 16.4 : 17);

const lineFeature = (coordinates) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates }, properties: {} });

export const NavMap = forwardRef(function NavMap({ line, progress, speed, following, onUserMove, bottomInset }, ref) {
  const { scheme, colors } = useTheme();
  const { height } = useWindowDimensions();
  const camera = useRef(null);
  const heading = useRef(null);
  const { reports, peakSpots } = useMapLayers(progress?.point ?? line.coordinates[0]);

  const [travelled, ahead] = useMemo(
    () => (progress ? splitAt(line, progress) : [[], line.coordinates]),
    [line, progress],
  );

  const follow = (duration) => {
    if (!progress) return;
    heading.current = smoothBearing(heading.current, progress.bearing, 0.6);
    camera.current?.easeTo({
      center: progress.point,
      bearing: heading.current,
      pitch: PITCH,
      zoom: zoomFor(speed ?? 0),
      // Driver in the lower third, so most of the screen shows the road ahead
      padding: { top: height * 0.45, bottom: bottomInset, left: 0, right: 0 },
      duration,
      easing: 'linear',
    });
  };

  useEffect(() => {
    if (following) follow(1000);
  }, [progress, following]);

  // Re-centre: catch up quickly rather than over a slow glide
  useImperativeHandle(ref, () => ({ recentre: () => follow(400) }));

  const puck = progress && {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: progress.point },
    properties: { bearing: progress.bearing },
  };

  return (
    <Map
      style={StyleSheet.absoluteFill}
      mapStyle={mapStyle(scheme)}
      logo={false}
      compass={false}
      attributionPosition={{ bottom: bottomInset + 8, left: 8 }}
      onRegionDidChange={(event) => {
        if (event.nativeEvent.userInteraction) onUserMove();
      }}
    >
      <Camera
        ref={camera}
        initialViewState={{ center: line.coordinates[0], zoom: 17, pitch: PITCH, bearing: progress?.bearing ?? 0 }}
      />
      <Images images={{ 'nav-arrow': require('../../assets/map/nav-arrow.png') }} />
      <GeoJSONSource id="nav-travelled" data={lineFeature(travelled.length > 1 ? travelled : [line.coordinates[0], line.coordinates[0]])}>
        <Layer
          id="nav-travelled-line"
          type="line"
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{ 'line-color': scheme === 'dark' ? '#6B7280' : '#9CA3AF', 'line-width': 8 }}
        />
      </GeoJSONSource>
      <GeoJSONSource id="nav-ahead" data={lineFeature(ahead)}>
        <Layer
          id="nav-ahead-casing"
          type="line"
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{ 'line-color': scheme === 'dark' ? '#111827' : '#FFFFFF', 'line-width': 14 }}
        />
        <Layer
          id="nav-ahead-line"
          type="line"
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{ 'line-color': colors.primary, 'line-width': 9 }}
        />
      </GeoJSONSource>
      <MapLayers reports={reports} peakSpots={peakSpots} scheme={scheme} />
      {puck && (
        <GeoJSONSource id="nav-puck" data={puck}>
          <Layer
            id="nav-puck-arrow"
            type="symbol"
            layout={{
              'icon-image': 'nav-arrow',
              'icon-rotate': ['get', 'bearing'],
              // Lie flat on the road and turn with it, like a car on the map
              'icon-rotation-alignment': 'map',
              'icon-pitch-alignment': 'map',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            }}
          />
        </GeoJSONSource>
      )}
    </Map>
  );
});
