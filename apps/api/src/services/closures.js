import { query } from '../db/pool.js';

/** Published event closures that have not ended, within `radius` metres. */
export async function listClosures({ lat, lng, radius, at = new Date() }) {
  const { rows } = await query(
    `SELECT c.id, c.title, c.note, c.starts_at, c.ends_at, c.road_names,
            (c.starts_at <= $4 AND c.ends_at > $4) AS active,
            ST_AsGeoJSON(c.geom)::json AS geometry,
            ST_Distance(c.geom, pt.geom) AS distance_m
     FROM event_closures c
     CROSS JOIN (SELECT ST_SetSRID(ST_MakePoint($2::float8, $1::float8), 4326)::geography AS geom) pt
     WHERE c.status = 'published' AND c.ends_at > $4 AND ST_DWithin(c.geom, pt.geom, $3)
     ORDER BY c.starts_at`,
    [lat, lng, radius, at],
  );
  return rows.map(({ distance_m, ...closure }) => ({ ...closure, distance_m: Math.round(distance_m) }));
}
