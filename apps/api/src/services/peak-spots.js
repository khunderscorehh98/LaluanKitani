import { query } from '../db/pool.js';
import { peakSpotActivity } from '../lib/peak-spots.js';
import { bruneiClock } from '../lib/time.js';

/**
 * School terms covering `date`, or null when no calendar is loaded for that
 * year (term filters are then skipped rather than guessed).
 */
async function schoolTermsOn(date) {
  const { rows } = await query(
    `SELECT
       EXISTS (SELECT 1 FROM school_calendar
               WHERE extract(year FROM starts_on) = extract(year FROM $1::date)) AS loaded,
       COALESCE(array_agg(term) FILTER (WHERE $1::date BETWEEN starts_on AND ends_on), '{}') AS terms
     FROM school_calendar`,
    [date],
  );
  return rows[0].loaded ? rows[0].terms : null;
}

/** Active Peak Spots whose zone lies within `radius` metres, with whether each is busy at `at`. */
export async function listPeakSpots({ lat, lng, radius, at = new Date() }) {
  const [spots, termsToday] = await Promise.all([
    query(
      `SELECT s.id, s.name, s.days, s.school_terms,
              ST_AsGeoJSON(s.geom)::json AS geometry,
              ST_Distance(s.geom, pt.geom) AS distance_m,
              COALESCE(
                json_agg(json_build_object('starts', to_char(w.starts, 'HH24:MI'),
                                           'ends',   to_char(w.ends,   'HH24:MI'))
                         ORDER BY w.starts) FILTER (WHERE w.id IS NOT NULL),
                '[]') AS windows
       FROM peak_spots s
       CROSS JOIN (SELECT ST_SetSRID(ST_MakePoint($2::float8, $1::float8), 4326)::geography AS geom) pt
       LEFT JOIN peak_spot_windows w ON w.peak_spot_id = s.id
       WHERE s.active AND ST_DWithin(s.geom, pt.geom, $3)
       GROUP BY s.id, pt.geom
       ORDER BY distance_m`,
      [lat, lng, radius],
    ),
    schoolTermsOn(bruneiClock(at).date),
  ]);

  return {
    at,
    school_calendar_loaded: termsToday !== null,
    peak_spots: spots.rows.map((spot) => ({
      id: spot.id,
      name: spot.name,
      days: spot.days,
      school_terms: spot.school_terms,
      windows: spot.windows,
      ...peakSpotActivity(spot, { at, termsToday }),
      distance_m: Math.round(spot.distance_m),
      geometry: spot.geometry,
    })),
  };
}
