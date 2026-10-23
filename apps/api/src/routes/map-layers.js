// What the map shows around a point: live reports, Peak Spots and event closures.
import { Router } from 'express';
import { z } from 'zod';
import { validateQuery } from '../middleware/validate.js';
import { at, lat, lng, radius } from '../lib/schemas.js';
import { listLiveReports } from '../services/reports.js';
import { listPeakSpots } from '../services/peak-spots.js';
import { listClosures } from '../services/closures.js';

export const mapLayersRouter = Router();

const around = (fallback, max) => z.object({ lat, lng, radius: radius(fallback, max), at });

// GET /v1/reports?lat=4.90&lng=114.92&radius=2000
mapLayersRouter.get('/reports', validateQuery(around(2_000, 20_000)), async (req, res) => {
  res.json({ reports: await listLiveReports(req.valid.query) });
});

// GET /v1/peak-spots?lat=4.90&lng=114.92&radius=5000&at=2026-10-26T07:10:00%2B08:00
mapLayersRouter.get('/peak-spots', validateQuery(around(5_000, 30_000)), async (req, res) => {
  const { at: when, ...area } = req.valid.query;
  res.json(await listPeakSpots({ ...area, at: when ?? new Date() }));
});

// GET /v1/closures?lat=4.94&lng=114.93&radius=10000
mapLayersRouter.get('/closures', validateQuery(around(10_000, 50_000)), async (req, res) => {
  const { at: when, ...area } = req.valid.query;
  res.json({ closures: await listClosures({ ...area, at: when ?? new Date() }) });
});
