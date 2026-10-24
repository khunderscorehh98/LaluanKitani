import { Router } from 'express';
import { z } from 'zod';
import { validateParams, validateQuery } from '../middleware/validate.js';
import { at, idParams, lang, lat, lng, withOptionalPoint } from '../lib/schemas.js';
import { findPlaceAtLabel, getPlace, searchPlaces } from '../services/places.js';

export const placesRouter = Router();

const searchQuery = withOptionalPoint({
  q: z.string().trim().min(2, 'Type at least 2 characters').max(100),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  lang,
});

// GET /v1/places/search?q=stadium%20negara&lat=4.90&lng=114.92
placesRouter.get('/search', validateQuery(searchQuery), async (req, res) => {
  res.json(await searchPlaces(req.valid.query));
});

// GET /v1/places/at-label?lat=4.9043&lng=114.9318&name=Wayback%20Burgers
// The place behind a tapped base-map label, or { place: null } if we don't have it.
// Declared before /:id so "at-label" is not read as an id.
const labelQuery = z.object({ lat, lng, name: z.string().trim().min(1).max(200), lang });
placesRouter.get('/at-label', validateQuery(labelQuery), async (req, res) => {
  res.json({ place: await findPlaceAtLabel(req.valid.query) });
});

const detailsQuery = withOptionalPoint({ lang, at });

// GET /v1/places/:id?lang=en&lat=4.90&lng=114.92
placesRouter.get('/:id', validateParams(idParams), validateQuery(detailsQuery), async (req, res) => {
  const { lang: language, lat, lng, at: when } = req.valid.query;
  res.json(await getPlace(req.valid.params.id, { lang: language, lat, lng, at: when ?? new Date() }));
});
