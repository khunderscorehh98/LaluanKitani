// End-to-end route planning. Needs the GraphHopper container ("docker compose
// up -d routing"); the routing tests are skipped, with a note, when it isn't running.
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config.js';
import { pool } from '../../src/db/pool.js';

const app = createApp();
afterAll(() => pool.end());

const graphhopperUp = await fetch(`${config.GRAPHHOPPER_URL}/health`, { signal: AbortSignal.timeout(2000) })
  .then((r) => r.ok)
  .catch(() => false);
if (!graphhopperUp) console.warn('GraphHopper not reachable: skipping routing tests');

// Sinar Kiulap Eatery -> Immigration Department, Berakas
const TRIP = { from_lat: 4.903, from_lng: 114.923, to_lat: 4.9195, to_lng: 114.933 };
// A Sunday morning: no school-run Peak Spots
const SUNDAY = '2026-10-25T10:00:00+08:00';
const DRIVER = '00000000-0000-4000-8000-000000000014';
const VOTERS = ['00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000012'];

const route = (query) => request(app).get('/v1/route').query(query);

async function addReport(label, [lng, lat], { confirmed = false } = {}) {
  const { rows } = await pool.query(
    `INSERT INTO reports (label, geom, user_id, expires_at)
     VALUES ($1::report_label, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4,
             CASE WHEN $1::report_label IN ('closed', 'flooded') THEN NULL ELSE now() + interval '1 hour' END)
     RETURNING id`,
    [label, lng, lat, DRIVER],
  );
  const { id } = rows[0];
  if (confirmed) {
    for (const voter of VOTERS) {
      await pool.query(`INSERT INTO report_votes (report_id, user_id, vote) VALUES ($1, $2, 'still_there')`, [id, voter]);
    }
  }
  return id;
}

describe('GET /v1/route validation', () => {
  it('only plans routes in Brunei', async () => {
    const res = await route({ ...TRIP, to_lat: 1.35, to_lng: 103.82 }).expect(400);
    expect(res.body.error.code).toBe('invalid_request');
  });

  it('takes a departure time or an arrival time, not both', async () => {
    await route({ ...TRIP, at: SUNDAY, arrive_by: '2026-10-25T11:00:00+08:00' }).expect(400);
  });
});

describe.runIf(graphhopperUp)('GET /v1/route', () => {
  it('returns routes with steps, geometry and an ETA, fastest first', async () => {
    const res = await route({ ...TRIP, at: SUNDAY }).expect(200);
    const [first] = res.body.routes;
    expect(first.distance_m).toBeGreaterThan(1000);
    expect(first.geometry.type).toBe('LineString');
    expect(first.steps.at(-1).type).toBe('arrive');
    expect(new Date(first.eta) - new Date(SUNDAY)).toBe(first.duration_s * 1000);
    const durations = res.body.routes.map((r) => r.duration_s);
    expect(durations).toEqual([...durations].sort((a, b) => a - b));
  });

  it('gives a leave-by time when planning to arrive on time', async () => {
    const arriveBy = '2026-10-26T08:00:00+08:00';
    const res = await route({ ...TRIP, arrive_by: arriveBy }).expect(200);
    const [first] = res.body.routes;
    expect(new Date(first.leave_by).getTime()).toBe(new Date(arriveBy).getTime() - first.duration_s * 1000);
    expect(res.body.depart_at).toBe(first.leave_by);
  });

  it('routes around a confirmed Closed report on the way', async () => {
    const before = await route({ ...TRIP, at: SUNDAY }).expect(200);
    const line = before.body.routes[0].geometry.coordinates;
    const id = await addReport('closed', line[Math.floor(line.length / 2)], { confirmed: true });
    try {
      const after = await route({ ...TRIP, at: SUNDAY }).expect(200);
      for (const r of after.body.routes) expect(r.reports.map((report) => report.id)).not.toContain(id);
      expect(after.body.avoided_closures).toBe(before.body.avoided_closures + 1);
    } finally {
      await pool.query('DELETE FROM reports WHERE id = $1', [id]);
    }
  });

  it('does not avoid an unconfirmed Closed report, but lists it', async () => {
    const before = await route({ ...TRIP, at: SUNDAY }).expect(200);
    const line = before.body.routes[0].geometry.coordinates;
    const id = await addReport('closed', line[Math.floor(line.length / 2)]);
    try {
      const after = await route({ ...TRIP, at: SUNDAY }).expect(200);
      expect(after.body.routes[0].reports.find((r) => r.id === id)).toMatchObject({ confirmed: false, routing_effect: 'none' });
    } finally {
      await pool.query('DELETE FROM reports WHERE id = $1', [id]);
    }
  });

  it('lists reports along the route in driving order', async () => {
    const before = await route({ ...TRIP, at: SUNDAY }).expect(200);
    const line = before.body.routes[0].geometry.coordinates;
    const far = await addReport('careful', line[Math.floor((line.length * 3) / 4)]);
    const near = await addReport('careful', line[Math.floor(line.length / 4)]);
    try {
      const res = await route({ ...TRIP, at: SUNDAY }).expect(200);
      const listed = res.body.routes[0].reports.filter((r) => r.id === far || r.id === near);
      expect(listed.map((r) => r.id)).toEqual([near, far]);
      expect(listed[0].distance_from_start_m).toBeLessThan(listed[1].distance_from_start_m);
    } finally {
      await pool.query('DELETE FROM reports WHERE id = ANY($1)', [[far, near]]);
    }
  });
});
