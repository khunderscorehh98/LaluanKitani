import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

// Brunei, with a margin. Matches the --bbox used to cut brunei.pmtiles.
export const BRUNEI_BOUNDS = [113.95, 3.95, 115.4, 5.1];

export const inBrunei = ([lng, lat]) =>
  lng >= BRUNEI_BOUNDS[0] && lat >= BRUNEI_BOUNDS[1] && lng <= BRUNEI_BOUNDS[2] && lat <= BRUNEI_BOUNDS[3];

/** [lng, lat] of the phone. A cached fix is used when it is recent; otherwise asks the GPS. */
export async function currentLngLat({ maxAge = 60_000 } = {}) {
  const position =
    (await Location.getLastKnownPositionAsync({ maxAge })) ??
    (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return [position.coords.longitude, position.coords.latitude];
}

/**
 * Where the driver is, for distances: [lng, lat] when location is allowed and
 * they are in Brunei, otherwise null. Never asks for permission itself.
 */
export function useOrigin() {
  const [permission] = Location.useForegroundPermissions();
  const [origin, setOrigin] = useState(null);
  useEffect(() => {
    if (!permission?.granted) return;
    currentLngLat({ maxAge: 5 * 60_000 })
      .then((lngLat) => inBrunei(lngLat) && setOrigin(lngLat))
      .catch(() => {});
  }, [permission?.granted]);
  return { origin, located: Boolean(permission?.granted) };
}
