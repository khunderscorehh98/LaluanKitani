import { Router } from 'express';
import { query } from '../db/pool.js';

export const healthRouter = Router();

healthRouter.get('/health', async (req, res) => {
  try {
    const { rows } = await query('SELECT postgis_lib_version() AS postgis');
    res.json({ status: 'ok', database: 'ok', postgis: rows[0].postgis });
  } catch (err) {
    req.log.error({ err }, 'health check: database unreachable');
    res.status(503).json({ status: 'degraded', database: 'unreachable' });
  }
});
