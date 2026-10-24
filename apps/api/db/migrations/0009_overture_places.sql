-- Overture Places import (scripts/import-places.js).
-- confidence: Overture's 0-1 estimate that the place exists as described.
-- Kept so admins can review doubtful places first.
ALTER TABLE places_base ADD COLUMN confidence real;

-- Finding the base place under a tapped map label (name near a point)
CREATE INDEX places_base_name_trgm_idx ON places_base USING gin (lower(name) gin_trgm_ops);
