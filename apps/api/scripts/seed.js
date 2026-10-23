import pg from 'pg';
import { seed } from '../src/db/migrator.js';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to load demo fixtures into a production database.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  await seed(pool);
  console.log('Demo fixtures loaded.');
} catch (err) {
  console.error(`Seeding failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
