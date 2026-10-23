import pg from 'pg';
import { migrate } from '../src/db/migrator.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const ran = await migrate(pool, (line) => console.log(line));
  console.log(ran.length ? `Done: ${ran.length} migration(s) applied.` : 'Database is up to date.');
} catch (err) {
  console.error(`Migration failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
