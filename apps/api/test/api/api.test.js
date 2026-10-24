// End-to-end tests against the seeded test database (see db/seeds/dev.sql).
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { pool } from '../../src/db/pool.js';

const app = createApp();
afterAll(() => pool.end());

const SINAR = '00000000-0000-4000-8000-000000000201';
const STADIUM = '00000000-0000-4000-8000-000000000101';
const MOSQUE = '00000000-0000-4000-8000-000000000103';
const NEAR_SINAR = { lat: 4.903, lng: 114.923 };

describe('GET /health', () => {
  it('reports the database and PostGIS version', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'ok' });
    expect(res.body.postgis).toMatch(/^\d+\.\d+/);
  });
});

describe('GET /v1/places/search', () => {
  const search = (query) => request(app).get('/v1/places/search').query(query).expect(200);

  it('finds a place by its local name', async () => {
    const res = await search({ q: 'Stadium Negara' });
    expect(res.body.results[0].id).toBe(STADIUM);
  });

  it('reports which alias matched', async () => {
    const res = await search({ q: 'JPD' });
    expect(res.body.results[0].match).toEqual({ type: 'alias', alias: 'JPD' });
  });

  it('tolerates typos', async () => {
    const res = await search({ q: 'stadim' });
    expect(res.body.results.map((place) => place.id)).toEqual([STADIUM]);
  });

  it('answers a need through the intent table', async () => {
    const res = await search({ q: 'renew passport', lang: 'en' });
    expect(res.body.intent).toEqual({ need: 'passport', categories: ['immigration_office'] });
    expect(res.body.results[0]).toMatchObject({
      name: 'Immigration Department',
      match: { type: 'intent', need: 'passport' },
    });
  });

  it('lists every road that has a simpang number', async () => {
    const res = await search({ q: 'Simpang 1366' });
    expect(res.body.simpang.roads.map((road) => road.road)).toEqual(['Jalan Gadong', 'Jalan Tutong']);
    expect(res.body.results).toHaveLength(2);
  });

  it('narrows a simpang search by road name', async () => {
    const res = await search({ q: 'spg 1366 jln gadong', ...NEAR_SINAR });
    expect(res.body.results.map((place) => place.id)).toEqual([SINAR]);
    expect(res.body.results[0].distance_m).toBeLessThan(50);
  });

  it('uses the requested language for the display name', async () => {
    const ms = await search({ q: 'Sinar', lang: 'ms' });
    const en = await search({ q: 'Sinar', lang: 'en' });
    expect(ms.body.results[0].name).toBe('Kedai Makan Sinar Kiulap');
    expect(en.body.results[0].name).toBe('Sinar Kiulap Eatery');
  });

  it('logs searches with no results anonymously', async () => {
    const res = await search({ q: 'qqzzxx' });
    expect(res.body.results).toEqual([]);
    const { rows } = await pool.query("SELECT * FROM search_misses WHERE query = 'qqzzxx'");
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual(['created_at', 'id', 'query']);
  });

  it('rejects bad input with field-level details', async () => {
    const res = await request(app).get('/v1/places/search').query({ q: 'a', lat: 4.9 }).expect(400);
    expect(res.body.error.code).toBe('invalid_request');
    expect(res.body.error.details.map((detail) => detail.field).sort()).toEqual(['lat', 'q']);
  });
});

describe('GET /v1/places/:id', () => {
  const fridayLunch = '2026-10-23T12:40:00+08:00';

  it('returns the place details page data', async () => {
    const res = await request(app).get(`/v1/places/${SINAR}`).query({ at: fridayLunch }).expect(200);
    expect(res.body).toMatchObject({
      name: 'Kedai Makan Sinar Kiulap',
      simpang: '1366',
      status: { state: 'closed_friday_prayers', reopens_at: '14:00' },
      friday_prayer_closure: true,
    });
    expect(res.body.also_known_as.map((alias) => alias.alias)).toContain('Kedai Sinar');
    expect(res.body.hours).toHaveLength(7);
    expect(res.body.busy_times.map((spot) => spot.name)).toContain('Jalan Gadong school run');
    expect(res.body.last_verified_at).not.toBeNull();
  });

  it('lists nearby reports with their routing effect', async () => {
    const res = await request(app).get(`/v1/places/${SINAR}`).expect(200);
    const byLabel = Object.fromEntries(res.body.nearby_reports.map((report) => [report.label, report]));
    expect(byLabel.flooded).toMatchObject({ confirmed: true, routing_effect: 'hard_avoid' });
    expect(byLabel.closed).toMatchObject({ confirmed: false, routing_effect: 'none' });
  });

  it('says "hours not confirmed" for a mosque with no hours, and skips the Friday rule', async () => {
    const res = await request(app).get(`/v1/places/${MOSQUE}`).query({ at: fridayLunch, lang: 'en' }).expect(200);
    expect(res.body).toMatchObject({
      name: 'Omar Ali Saifuddien Mosque',
      status: { state: 'hours_not_confirmed' },
      friday_prayer_closure: false,
      hours: null,
    });
  });

  it('returns 404 for an unknown place and 400 for a malformed id', async () => {
    await request(app).get('/v1/places/00000000-0000-4000-8000-000000000999').expect(404);
    await request(app).get('/v1/places/not-a-uuid').expect(400);
  });
});

describe('map layers', () => {
  it('lists live reports nearest first, leaving out expired ones', async () => {
    const res = await request(app).get('/v1/reports').query({ ...NEAR_SINAR, radius: 3000 }).expect(200);
    const ids = res.body.reports.map((report) => report.id);
    expect(ids).not.toContain('00000000-0000-4000-8000-000000000305');
    const distances = res.body.reports.map((report) => report.distance_m);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    expect(res.body.reports[0].reporter).toEqual({ nickname: 'awang_hadi' });
  });

  it('marks Peak Spots busy during their windows', async () => {
    const res = await request(app)
      .get('/v1/peak-spots')
      .query({ ...NEAR_SINAR, at: '2026-10-26T07:10:00+08:00' })
      .expect(200);
    expect(res.body.school_calendar_loaded).toBe(false);
    const schoolRun = res.body.peak_spots.find((spot) => spot.name === 'Jalan Gadong school run');
    expect(schoolRun).toMatchObject({ active: true, busy_until: '07:45' });
    expect(schoolRun.geometry.type).toBe('Polygon');
  });

  it('lists upcoming published closures', async () => {
    const res = await request(app).get('/v1/closures').query({ lat: 4.946, lng: 114.929 }).expect(200);
    expect(res.body.closures[0]).toMatchObject({ title: 'Stadium event', active: false });
    expect(res.body.closures[0].geometry.type).toBe('MultiLineString');
  });

  it('requires a location', async () => {
    await request(app).get('/v1/reports').expect(400);
  });
});

describe('audit log', () => {
  it('cannot be edited or deleted', async () => {
    await pool.query(
      "INSERT INTO audit_log (action, target_type, target_id) VALUES ('test', 'place', 'x')",
    );
    await expect(pool.query("UPDATE audit_log SET action = 'changed'")).rejects.toThrow(/cannot be changed/);
    await expect(pool.query('DELETE FROM audit_log')).rejects.toThrow(/cannot be changed/);
  });
});

describe('unknown routes', () => {
  it('return a JSON 404', async () => {
    const res = await request(app).get('/v1/nope').expect(404);
    expect(res.body.error.code).toBe('not_found');
  });
});

describe('GET /v1/places/at-label', () => {
  const lookup = (query) => request(app).get('/v1/places/at-label').query(query).expect(200);

  it('finds our place behind a map label by name and position', async () => {
    const res = await lookup({ lat: 4.9461, lng: 114.9291, name: 'National Stadium', lang: 'en' });
    expect(res.body.place).toMatchObject({ id: STADIUM, match: { type: 'map_label' } });
  });

  it('returns null when the name matches but the place is elsewhere', async () => {
    const res = await lookup({ lat: 4.8, lng: 114.6, name: 'National Stadium' });
    expect(res.body.place).toBeNull();
  });

  it('returns null for a label we do not have', async () => {
    const res = await lookup({ lat: 4.9461, lng: 114.9291, name: 'Kedai Runcit Tiada' });
    expect(res.body.place).toBeNull();
  });
});
