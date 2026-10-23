import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { config } from './config.js';
import { logger } from './logger.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { healthRouter } from './routes/health.js';
import { placesRouter } from './routes/places.js';
import { mapLayersRouter } from './routes/map-layers.js';

export function createApp() {
  const app = express();

  // Runs behind Nginx on the server; trust only the local proxy.
  app.set('trust proxy', 'loopback');

  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGINS }));
  app.use(express.json({ limit: '100kb' }));
  app.use(pinoHttp({ logger }));

  app.use(healthRouter);
  app.use('/v1/places', placesRouter);
  app.use('/v1', mapLayersRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
