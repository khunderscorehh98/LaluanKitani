import pg from 'pg';
import { migrate, resetSchema, seed } from '../src/db/migrator.js';

// Rebuilds the test database from scratch before the suite runs.
export async function setup() {
  // Set and checked in vitest.config.js
  const url = process.env.TEST_DATABASE_URL;
  if (!url.includes('test')) {
    throw new Error(`Refusing to reset a database whose name does not contain "test": ${url}`);
  }

  const pool = new pg.Pool({ connectionString: url });
  try {
    await resetSchema(pool);
    await migrate(pool);
    await seed(pool);
  } catch (err) {
    throw new Error(`Test database setup failed (is "docker compose up -d" running?): ${err.message}`);
  } finally {
    await pool.end();
  }
}
