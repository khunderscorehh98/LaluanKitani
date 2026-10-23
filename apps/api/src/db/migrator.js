import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DB_DIR = fileURLToPath(new URL('../../db/', import.meta.url));
const MIGRATIONS_DIR = path.join(DB_DIR, 'migrations');
const SEED_FILE = path.join(DB_DIR, 'seeds', 'dev.sql');

// Any fixed number works; it stops two migrators running at once.
const MIGRATION_LOCK_ID = 7_160_001;

/** Applies every db/migrations/*.sql file not yet recorded, each in its own transaction. */
export async function migrate(pool, log = () => {}) {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`);

    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.name));
    const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith('.sql')).sort();
    const ran = [];

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        err.message = `${file}: ${err.message}`;
        throw err;
      }
      log(`applied ${file}`);
      ran.push(file);
    }
    return ran;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]).catch(() => {});
    client.release();
  }
}

/** Loads the development and test fixtures. */
export async function seed(pool) {
  const sql = await readFile(SEED_FILE, 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Drops every table, view and extension in the public schema. Development and test only. */
export async function resetSchema(pool) {
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
}
