import { z } from 'zod';

export const lang = z.enum(['ms', 'en']).default('ms');
export const lat = z.coerce.number().min(-90).max(90);
export const lng = z.coerce.number().min(-180).max(180);
export const uuid = z.string().uuid();
// Lets clients (and tests) ask "what about at this moment", e.g. for Leave by planning.
export const at = z.coerce.date().optional();

export const radius = (fallback, max) => z.coerce.number().int().min(1).max(max).default(fallback);

export const idParams = z.object({ id: uuid });

/** Adds a check that lat and lng are both given or both left out. */
export function withOptionalPoint(shape) {
  return z
    .object({ lat: lat.optional(), lng: lng.optional(), ...shape })
    .refine((value) => (value.lat === undefined) === (value.lng === undefined), {
      message: 'lat and lng must be given together',
      path: ['lat'],
    });
}
