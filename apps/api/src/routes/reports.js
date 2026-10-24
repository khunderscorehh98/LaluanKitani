// Posting reports and voting on them. Both need an account (product rule:
// rate limits, reputation and abuse handling). Viewing never does.
import { Router } from 'express';
import { z } from 'zod';
import { DESCRIPTION_MAX_LENGTH, LABELS } from '../lib/reports.js';
import { idParams, lat, lng, withOptionalPoint } from '../lib/schemas.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { createReport, getLiveReport, voteOnReport } from '../services/reports.js';

export const reportsRouter = Router();

// Brunei, with a margin (the same box the map tiles cover)
const BRUNEI = { west: 113.95, south: 3.95, east: 115.4, north: 5.1 };

const newReport = z
  .object({
    label: z.enum(LABELS),
    lat,
    lng,
    // Typed only while stopped (the app enforces it); blank means none
    description: z
      .string()
      .trim()
      .max(DESCRIPTION_MAX_LENGTH)
      .optional()
      .transform((text) => text || undefined),
  })
  .refine((r) => r.lng >= BRUNEI.west && r.lng <= BRUNEI.east && r.lat >= BRUNEI.south && r.lat <= BRUNEI.north, {
    message: 'Reports can only be made in Brunei',
    path: ['lat'],
  });

// POST /v1/reports { label, lat, lng, description? }
reportsRouter.post('/', requireAuth, validateBody(newReport), async (req, res) => {
  const report = await createReport({ userId: req.user.id, ...req.valid.body });
  res.status(201).json({ report });
});

// GET /v1/reports/:id?lat=&lng=
reportsRouter.get(
  '/:id',
  optionalAuth,
  validateParams(idParams),
  validateQuery(withOptionalPoint({})),
  async (req, res) => {
    const { lat: fromLat, lng: fromLng } = req.valid.query;
    const report = await getLiveReport(req.valid.params.id, { lat: fromLat, lng: fromLng, viewerId: req.user?.id });
    res.json({ report });
  },
);

// POST /v1/reports/:id/votes { vote: 'still_there' | 'gone' }
reportsRouter.post(
  '/:id/votes',
  requireAuth,
  validateParams(idParams),
  validateBody(z.object({ vote: z.enum(['still_there', 'gone']) })),
  async (req, res) => {
    res.json(await voteOnReport({ reportId: req.valid.params.id, userId: req.user.id, vote: req.valid.body.vote }));
  },
);
