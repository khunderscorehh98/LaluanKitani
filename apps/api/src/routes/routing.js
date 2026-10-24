// Route planning. Works without an account, like search and the map.
import { Router } from 'express';
import { z } from 'zod';
import { lat, lng } from '../lib/schemas.js';
import { validateQuery } from '../middleware/validate.js';
import { getRoutes } from '../services/routing.js';

export const routingRouter = Router();

// Brunei, with a margin: the area the routing graph covers
const BRUNEI = { west: 113.95, south: 3.95, east: 115.4, north: 5.1 };
const inBrunei = (p) => p.lng >= BRUNEI.west && p.lng <= BRUNEI.east && p.lat >= BRUNEI.south && p.lat <= BRUNEI.north;

const routeQuery = z
  .object({
    from_lat: lat,
    from_lng: lng,
    to_lat: lat,
    to_lng: lng,
    // Depart at this time (default now), or plan to arrive by a time ("Leave by")
    at: z.coerce.date().optional(),
    arrive_by: z.coerce.date().optional(),
  })
  .refine((q) => !(q.at && q.arrive_by), { message: 'Give at or arrive_by, not both', path: ['arrive_by'] })
  .refine((q) => inBrunei({ lat: q.from_lat, lng: q.from_lng }) && inBrunei({ lat: q.to_lat, lng: q.to_lng }), {
    message: 'Routes are only available in Brunei',
    path: ['from_lat'],
  });

// GET /v1/route?from_lat=4.903&from_lng=114.923&to_lat=4.946&to_lng=114.929[&arrive_by=...]
routingRouter.get('/', validateQuery(routeQuery), async (req, res) => {
  const q = req.valid.query;
  res.json(
    await getRoutes({
      from: { lat: q.from_lat, lng: q.from_lng },
      to: { lat: q.to_lat, lng: q.to_lng },
      at: q.at,
      arriveBy: q.arrive_by,
    }),
  );
});
