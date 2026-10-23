import { query } from '../db/pool.js';
import { isConfirmed, routingEffect } from '../lib/reports.js';

/** Live (unexpired, not removed) reports within `radius` metres, nearest first. */
export async function listLiveReports({ lat, lng, radius }) {
  const { rows } = await query(
    `SELECT r.id, r.label,
            CASE WHEN r.description_hidden THEN NULL ELSE r.description END AS description,
            r.road_name, r.created_at, r.expires_at,
            r.still_there_count, r.gone_count,
            u.nickname AS reporter_nickname,
            ST_Y(r.geom::geometry) AS lat,
            ST_X(r.geom::geometry) AS lng,
            ST_Distance(r.geom, pt.geom) AS distance_m
     FROM reports_live r
     CROSS JOIN (SELECT ST_SetSRID(ST_MakePoint($2::float8, $1::float8), 4326)::geography AS geom) pt
     LEFT JOIN users u ON u.id = r.user_id
     WHERE ST_DWithin(r.geom, pt.geom, $3)
     ORDER BY distance_m`,
    [lat, lng, radius],
  );

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    description: row.description,
    road_name: row.road_name,
    location: { lat: row.lat, lng: row.lng },
    distance_m: Math.round(row.distance_m),
    created_at: row.created_at,
    expires_at: row.expires_at,
    votes: { still_there: row.still_there_count, gone: row.gone_count },
    confirmed: isConfirmed(row.label, row.still_there_count),
    routing_effect: routingEffect(row.label, row.still_there_count),
    // Reports show a nickname, never a real name. Null once the account is deleted.
    reporter: row.reporter_nickname ? { nickname: row.reporter_nickname } : null,
  }));
}
