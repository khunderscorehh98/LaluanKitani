// Imports Overture Maps Places for Brunei into places + places_base (the
// "base" layer: open data, never edited by hand, refreshed by re-running this).
// Admin fixes live in place_overrides and survive re-imports.
//
//   npm run places:import                        latest Overture release
//   npm run places:import -- --release 2026-10-21.0 --min-confidence 0.5
//   npm run places:import -- --file places.ndjson  load an earlier extract
//
// Needs the DuckDB CLI (tools/duckdb/ at the repo root, or DUCKDB_PATH) to read
// Overture's GeoParquet from its public S3 bucket. Only the Brunei area is downloaded.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { pool } from '../src/db/pool.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
// Brunei, with a margin; points outside Brunei (Sarawak, Sabah) are dropped by country
const BBOX = { west: 113.95, south: 3.95, east: 115.4, north: 5.1 };
const BATCH = 1000;

const { values: args } = parseArgs({
  options: {
    release: { type: 'string' },
    'min-confidence': { type: 'string', default: '0.5' },
    file: { type: 'string' },
    // Allow an import that would remove most existing base places (normally a sign of a bad download)
    force: { type: 'boolean', default: false },
  },
});

async function latestRelease() {
  const res = await fetch('https://stac.overturemaps.org/catalog.json');
  if (!res.ok) throw new Error(`Overture catalog: HTTP ${res.status}`);
  const catalog = await res.json();
  const releases = catalog.links
    .filter((link) => link.rel === 'child')
    .map((link) => link.href.match(/(\d{4}-\d{2}-\d{2}\.\d+)/)?.[1])
    .filter(Boolean)
    .sort();
  if (!releases.length) throw new Error('No releases found in the Overture catalog');
  return releases.at(-1);
}

function duckdbPath() {
  if (process.env.DUCKDB_PATH) return process.env.DUCKDB_PATH;
  const local = path.join(REPO_ROOT, 'tools', 'duckdb', process.platform === 'win32' ? 'duckdb.exe' : 'duckdb');
  if (existsSync(local)) return local;
  return 'duckdb';
}

/** Runs the DuckDB extract and returns the path of the NDJSON file it wrote. */
function extract(release, minConfidence) {
  const out = path.join(tmpdir(), `overture-places-brunei-${release}.ndjson`);
  const sql = `
    INSTALL httpfs; LOAD httpfs; SET s3_region = 'us-west-2';
    COPY (
      SELECT
        id,
        names.primary AS name,
        basic_category AS category,
        nullif(concat_ws(', ',
          nullif(trim(replace(addresses[1].freeform, '"', '')), ''),
          nullif(trim(addresses[1].locality), '')), '') AS address,
        phones[1] AS phone,
        websites[1] AS website,
        bbox.xmin AS lng,
        bbox.ymin AS lat,
        confidence,
        array_to_string(list_distinct(list_filter(list_transform(sources, lambda s: s.license), lambda l: l IS NOT NULL)), ', ') AS licence
      FROM read_parquet('s3://overturemaps-us-west-2/release/${release}/theme=places/type=place/*', hive_partitioning = 1)
      WHERE bbox.xmin BETWEEN ${BBOX.west} AND ${BBOX.east}
        AND bbox.ymin BETWEEN ${BBOX.south} AND ${BBOX.north}
        AND addresses[1].country = 'BN'
        AND names.primary IS NOT NULL
        AND confidence >= ${minConfidence}
        AND coalesce(operating_status, 'open') <> 'permanently_closed'
    ) TO '${out.replaceAll('\\', '/')}' (FORMAT json);`;
  console.log(`Extracting Brunei places from Overture ${release} (confidence >= ${minConfidence})...`);
  execFileSync(duckdbPath(), ['-c', sql], { stdio: ['ignore', 'inherit', 'inherit'] });
  return out;
}

function readPlaces(file) {
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line))
    .filter((p) => p.id && p.name && Number.isFinite(p.lng) && Number.isFinite(p.lat));
}

async function load(places) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT count(*)::int AS n FROM places_base b JOIN places p ON p.id = b.place_id WHERE p.overture_id NOT LIKE 'demo-%'`,
    );
    if (!args.force && existing.rows[0].n > 0 && places.length < existing.rows[0].n * 0.5) {
      throw new Error(
        `Import has ${places.length} places but the database has ${existing.rows[0].n}. ` +
          'That looks like a bad download; re-run with --force if it is intended.',
      );
    }

    let added = 0;
    for (let i = 0; i < places.length; i += BATCH) {
      const batch = places.slice(i, i + BATCH);
      const col = (key) => batch.map((p) => p[key] ?? null);

      const inserted = await client.query(
        `INSERT INTO places (source, overture_id)
         SELECT 'base', unnest($1::text[])
         ON CONFLICT (overture_id) DO NOTHING`,
        [col('id')],
      );
      added += inserted.rowCount;

      await client.query(
        `INSERT INTO places_base (place_id, name, category, address, phone, website, geom, licence, confidence, imported_at)
         SELECT p.id, v.name, v.category, v.address, v.phone, v.website,
                ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326)::geography,
                coalesce(nullif(v.licence, ''), 'CDLA-Permissive-2.0'), v.confidence, now()
         FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[],
                     $7::float8[], $8::float8[], $9::text[], $10::real[])
              AS v(overture_id, name, category, address, phone, website, lng, lat, licence, confidence)
         JOIN places p ON p.overture_id = v.overture_id
         ON CONFLICT (place_id) DO UPDATE SET
           name = EXCLUDED.name, category = EXCLUDED.category, address = EXCLUDED.address,
           phone = EXCLUDED.phone, website = EXCLUDED.website, geom = EXCLUDED.geom,
           licence = EXCLUDED.licence, confidence = EXCLUDED.confidence, imported_at = now()`,
        [
          col('id'), col('name'), col('category'), col('address'), col('phone'), col('website'),
          col('lng'), col('lat'), col('licence'), col('confidence'),
        ],
      );
    }

    // Places Overture no longer lists drop out of the app. Their places row stays,
    // so admin overrides, aliases, hours and old reports keep their references.
    const removed = await client.query(
      `DELETE FROM places_base b USING places p
       WHERE p.id = b.place_id AND p.overture_id NOT LIKE 'demo-%'
         AND NOT (p.overture_id = ANY($1::text[]))`,
      [places.map((p) => p.id)],
    );

    await client.query('COMMIT');
    return { added, updated: places.length - added, removed: removed.rowCount };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

try {
  let file = args.file;
  if (!file) {
    const release = args.release ?? (await latestRelease());
    file = extract(release, Number(args['min-confidence']));
  }
  const places = readPlaces(file);
  console.log(`Loading ${places.length} places...`);
  const result = await load(places);
  console.log(`Done: ${result.added} added, ${result.updated} updated, ${result.removed} removed.`);
} catch (err) {
  console.error(`Import failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
