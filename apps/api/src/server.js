import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { pool } from './db/pool.js';

const server = createApp().listen(config.PORT, () => {
  logger.info(`Laluan Kitani API listening on http://localhost:${config.PORT}`);
});

async function shutdown(signal) {
  logger.info(`${signal} received, shutting down`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  // Don't hang forever on open connections.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
