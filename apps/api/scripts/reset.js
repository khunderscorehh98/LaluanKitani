// Drops all data, re-runs every migration and reloads the demo fixtures.
// Usage: npm run db:reset -- --yes
import pg from 'pg';
import { migrate, resetSchema, seed } from '../src/db/migrator.js';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to reset a production database.');
  process.exit(1);
}
if (!process.argv.includes('--yes')) {
  console.error('This deletes all data in DATABASE_URL. Re-run with: npm run db:reset -- --yes');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  await resetSchema(pool);
  await migrate(pool, (line) => console.log(line));
  await seed(pool);
  console.log('Database reset and demo fixtures loaded.');
} catch (err) {
  console.error(`Reset failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
