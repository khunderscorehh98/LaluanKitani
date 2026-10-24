import { query } from '../db/pool.js';
import { ApiError, notFound } from '../lib/errors.js';
import { MAX_REPORTS_PER_HOUR, expiresAt, isConfirmed, routingEffect, shouldClear } from '../lib/reports.js';

// $1 = lat, $2 = lng of the point distances are measured from (may be NULL)
const REPORT_COLUMNS = `
  r.id, r.label, r.user_id,
  CASE WHEN r.description_hidden THEN NULL ELSE r.description END AS description,
  r.road_name, r.created_at, r.expires_at,
  r.still_there_count, r.gone_count,
  u.nickname AS reporter_nickname,
  ST_Y(r.geom::geometry) AS lat,
  ST_X(r.geom::geometry) AS lng,
  CASE WHEN $1::float8 IS NULL THEN NULL
       ELSE ST_Distance(r.geom, ST_SetSRID(ST_MakePoint($2::float8, $1::float8), 4326)::geography)
  END AS distance_m`;

function toReport(row) {
  return {
    id: row.id,
    label: row.label,
    description: row.description,
    road_name: row.road_name,
    location: { lat: row.lat, lng: row.lng },
    distance_m: row.distance_m === null ? null : Math.round(row.distance_m),
    created_at: row.created_at,
    expires_at: row.expires_at,
    votes: { still_there: row.still_there_count, gone: row.gone_count },
    confirmed: isConfirmed(row.label, row.still_there_count),
    routing_effect: routingEffect(row.label, row.still_there_count),
    // Reports show a nickname, never a real name. Null once the account is deleted.
    reporter: row.reporter_nickname ? { nickname: row.reporter_nickname } : null,
  };
}

/** Live (unexpired, not removed) reports within `radius` metres, nearest first. */
export async function listLiveReports({ lat, lng, radius }) {
  const { rows } = await query(
    `SELECT ${REPORT_COLUMNS}
     FROM reports_live r
     LEFT JOIN users u ON u.id = r.user_id
     WHERE ST_DWithin(r.geom, ST_SetSRID(ST_MakePoint($2::float8, $1::float8), 4326)::geography, $3)
     ORDER BY distance_m`,
    [lat, lng, radius],
  );
  return rows.map(toReport);
}

/**
 * One live report. With a signed-in viewer, also says whether it is theirs
 * and how they voted, so the app can show the right buttons.
 */
export async function getLiveReport(id, { lat = null, lng = null, viewerId = null } = {}) {
  const { rows } = await query(
    `SELECT ${REPORT_COLUMNS}, v.vote AS my_vote
     FROM reports_live r
     LEFT JOIN users u ON u.id = r.user_id
     LEFT JOIN report_votes v ON v.report_id = r.id AND v.user_id = $4
     WHERE r.id = $3`,
    [lat, lng, id, viewerId],
  );
  const row = rows[0];
  if (!row) throw notFound('Report');
  return {
    ...toReport(row),
    ...(viewerId && { mine: row.user_id === viewerId, my_vote: row.my_vote }),
  };
}

/** Posts a report at a point. The road name comes from the nearest known place on a road. */
export async function createReport({ userId, label, lat, lng, description }) {
  const recent = await query(
    `SELECT count(*)::int AS n FROM reports WHERE user_id = $1 AND created_at > now() - interval '1 hour'`,
    [userId],
  );
  if (recent.rows[0].n >= MAX_REPORTS_PER_HOUR) {
    throw new ApiError(429, 'too_many_reports', 'You have sent a lot of reports. Try again in a little while.');
  }

  const { rows } = await query(
    `INSERT INTO reports (label, description, geom, road_name, user_id, expires_at)
     SELECT $1, $2, pt.geom,
            (SELECT p.road FROM places_effective p
             WHERE p.road IS NOT NULL AND ST_DWithin(p.geom, pt.geom, 150)
             ORDER BY ST_Distance(p.geom, pt.geom) LIMIT 1),
            $5, $6
     FROM (SELECT ST_SetSRID(ST_MakePoint($4::float8, $3::float8), 4326)::geography AS geom) pt
     RETURNING id`,
    [label, description ?? null, lat, lng, userId, expiresAt(label)],
  );
  return getLiveReport(rows[0].id, { viewerId: userId });
}

/**
 * Records a driver's "Still there" / "It's gone" vote (changing their earlier
 * vote if any). Clears the report once enough drivers say it's gone.
 */
export async function voteOnReport({ reportId, userId, vote }) {
  const report = await getLiveReport(reportId, { viewerId: userId });
  if (report.mine) throw new ApiError(403, 'own_report', "You can't vote on your own report.");

  await query(
    `INSERT INTO report_votes (report_id, user_id, vote) VALUES ($1, $2, $3)
     ON CONFLICT (report_id, user_id) DO UPDATE SET vote = EXCLUDED.vote, created_at = now()`,
    [reportId, userId, vote],
  );

  const counts = await query('SELECT still_there_count, gone_count FROM reports_live WHERE id = $1', [reportId]);
  const { still_there_count: stillThere, gone_count: gone } = counts.rows[0];
  if (shouldClear(gone, stillThere)) {
    await query(`UPDATE reports SET status = 'cleared', ended_at = now() WHERE id = $1 AND status = 'active'`, [
      reportId,
    ]);
    return { cleared: true, report: null };
  }
  return { cleared: false, report: await getLiveReport(reportId, { viewerId: userId }) };
}
