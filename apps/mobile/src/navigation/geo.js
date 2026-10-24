// Small geometry helpers for following a route. Coordinates are [lng, lat];
// distances in metres. Flat-earth maths is fine at street scale in Brunei.

const EARTH_M = 6_371_000;
const rad = (deg) => (deg * Math.PI) / 180;

/** Metres between two [lng, lat] points. */
export function distance([lng1, lat1], [lng2, lat2]) {
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.sqrt(a));
}

/** Compass bearing from a to b, 0-360 degrees (0 = north). */
export function bearing([lng1, lat1], [lng2, lat2]) {
  const y = Math.sin(rad(lng2 - lng1)) * Math.cos(rad(lat2));
  const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) - Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lng2 - lng1));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** A route line prepared for repeated lookups: points plus distance from the start to each. */
export function prepareLine(coordinates) {
  const cumulative = [0];
  for (let i = 1; i < coordinates.length; i += 1) {
    cumulative.push(cumulative[i - 1] + distance(coordinates[i - 1], coordinates[i]));
  }
  return { coordinates, cumulative, length: cumulative.at(-1) };
}

/**
 * Where `point` falls on the line: the nearest point on it, the distance along
 * the line to there, how far the point is off the line, and the road's bearing there.
 * `fromAlong` limits the search to just behind where the driver last was, so a
 * road that loops back near itself doesn't make them jump.
 */
export function locateOnLine(line, point, fromAlong = 0) {
  const { coordinates, cumulative } = line;
  const scale = Math.cos(rad(point[1]));
  let best = null;
  for (let i = 0; i < coordinates.length - 1; i += 1) {
    if (cumulative[i + 1] < fromAlong - 50) continue;
    const a = coordinates[i];
    const b = coordinates[i + 1];
    // Project onto the segment in a local flat frame
    const ax = a[0] * scale;
    const bx = b[0] * scale;
    const px = point[0] * scale;
    const dx = bx - ax;
    const dy = b[1] - a[1];
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq ? Math.max(0, Math.min(1, ((px - ax) * dx + (point[1] - a[1]) * dy) / lengthSq)) : 0;
    const nearest = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const offset = distance(point, nearest);
    if (!best || offset < best.offset) {
      best = {
        point: nearest,
        offset,
        along: cumulative[i] + (cumulative[i + 1] - cumulative[i]) * t,
        bearing: bearing(a, b),
        segment: i,
      };
    }
  }
  return best;
}

/** The point `along` metres from the start of the line, and the road's bearing there. */
export function pointAt(line, along) {
  const { coordinates, cumulative, length } = line;
  const target = Math.max(0, Math.min(length, along));
  let i = cumulative.findIndex((d) => d >= target);
  if (i <= 0) i = 1;
  const a = coordinates[i - 1];
  const b = coordinates[i];
  const span = cumulative[i] - cumulative[i - 1];
  const t = span ? (target - cumulative[i - 1]) / span : 0;
  return { point: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], bearing: bearing(a, b), segment: i - 1 };
}

/** The line split where the driver is: [travelled, ahead], each a list of coordinates. */
export function splitAt(line, located) {
  const { coordinates } = line;
  const cut = located.segment + 1;
  return [
    [...coordinates.slice(0, cut), located.point],
    [located.point, ...coordinates.slice(cut)],
  ];
}

/** Shortest turn between two bearings, so the camera never spins the long way round. */
export function smoothBearing(previous, next, factor = 0.5) {
  if (previous === null || previous === undefined) return next;
  const delta = ((next - previous + 540) % 360) - 180;
  return (previous + delta * factor + 360) % 360;
}
