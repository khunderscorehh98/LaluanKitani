// Static map header showing where the place is. Not draggable: the screen
// scrolls underneath it.
import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { mapStyle } from '../map/style';
import { useTheme } from '../theme/useTheme';

export function PlaceMap({ location, style }) {
  const { scheme, colors } = useTheme();
  const center = [location.lng, location.lat];
  const pin = { type: 'Feature', geometry: { type: 'Point', coordinates: center }, properties: {} };

  return (
    <Map
      style={style}
      mapStyle={mapStyle(scheme)}
      logo={false}
      attribution={false}
      compass={false}
      dragPan={false}
      touchZoom={false}
      touchRotate={false}
      touchPitch={false}
      doubleTapZoom={false}
      doubleTapHoldZoom={false}
    >
      <Camera initialViewState={{ center, zoom: 15.5 }} />
      <GeoJSONSource id="place-pin" data={pin}>
        <Layer
          id="place-pin-circle"
          type="circle"
          paint={{
            'circle-radius': 12,
            'circle-color': colors.primary,
            'circle-stroke-color': '#FFFFFF',
            'circle-stroke-width': 3,
          }}
        />
      </GeoJSONSource>
    </Map>
  );
}
