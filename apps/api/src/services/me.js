// The signed-in driver's own activity: points, level and their reports.
import { pool, query } from '../db/pool.js';
import { levelFor, pointsFor } from '../lib/points.js';
import { isConfirmed } from '../lib/reports.js';

export async function getDriverStats(userId) {
  const { rows } = await query(
    `SELECT
       (SELECT count(*)::int FROM reports WHERE user_id = $1) AS reports,
       (SELECT count(*)::int FROM reports
        WHERE user_id = $1
          AND created_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Brunei') AT TIME ZONE 'Asia/Brunei'
       ) AS reports_this_month,
       (SELECT count(*)::int FROM report_votes v JOIN reports r ON r.id = v.report_id
        WHERE r.user_id = $1 AND v.vote = 'still_there') AS confirmations_received,
       (SELECT count(*)::int FROM report_votes WHERE user_id = $1) AS votes_cast`,
    [userId],
  );
  const counts = rows[0];
  const points = pointsFor({
    reports: counts.reports,
    confirmationsReceived: counts.confirmations_received,
    votesCast: counts.votes_cast,
  });
  return {
    points,
    ...levelFor(points),
    reports: counts.reports,
    reports_this_month: counts.reports_this_month,
    confirmations_received: counts.confirmations_received,
    votes_cast: counts.votes_cast,
  };
}

/** The driver's reports, newest first, including ended ones (so they can see what happened). */
export async function listMyReports(userId, { limit }) {
  const { rows } = await query(
    `SELECT r.id, r.label, r.road_name, r.created_at, r.expires_at, r.ended_at,
            CASE WHEN r.status = 'active' AND r.expires_at IS NOT NULL AND r.expires_at <= now()
                 THEN 'expired' ELSE r.status::text END AS status,
            (count(v.user_id) FILTER (WHERE v.vote = 'still_there'))::int AS still_there,
            (count(v.user_id) FILTER (WHERE v.vote = 'gone'))::int AS gone
     FROM reports r
     LEFT JOIN report_votes v ON v.report_id = r.id
     WHERE r.user_id = $1
     GROUP BY r.id
     ORDER BY r.created_at DESC
     LIMIT $2`,
    [userId, limit],
  );
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    road_name: row.road_name,
    created_at: row.created_at,
    expires_at: row.expires_at,
    ended_at: row.ended_at,
    // active | expired | cleared | removed
    status: row.status,
    votes: { still_there: row.still_there, gone: row.gone },
    confirmed: isConfirmed(row.label, row.still_there),
  }));
}

/**
 * Deletes the account (privacy rule): personal details go, sessions end,
 * past reports stay on the map but are no longer linked to anyone.
 * Saved places live only on the phone, so the app clears those itself.
 */
export async function deleteAccount(userId) {
  // One connection for the whole transaction (pool queries may each use a different one)
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE reports SET user_id = NULL WHERE user_id = $1', [userId]);
    await client.query('UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
    await client.query(
      `UPDATE users SET status = 'deleted', email = NULL, nickname = NULL, provider_subject = NULL
       WHERE id = $1`,
      [userId],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
