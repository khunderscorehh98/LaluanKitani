-- Place data layers:
--   base     : imported open data (Overture). Never edited; refreshed by re-import.
--   local    : places added by admins or approved driver suggestions.
--   override : admin fixes to base places. Wins over base data; revertible.
-- The app reads places_effective: base + local, with overrides applied, minus hidden.

CREATE TYPE place_status AS ENUM ('active', 'pending', 'rejected');

-- One row per place, whatever its source, so aliases, hours and reports
-- can reference any place with a stable id.
CREATE TABLE places (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source           text NOT NULL CHECK (source IN ('base', 'local')),
  overture_id      text UNIQUE,
  last_verified_at timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CHECK ((source = 'base') = (overture_id IS NOT NULL))
);

CREATE TABLE places_base (
  place_id    uuid PRIMARY KEY REFERENCES places (id) ON DELETE CASCADE,
  name        text NOT NULL,
  category    text,
  address     text,
  phone       text,
  website     text,
  geom        geography(Point, 4326) NOT NULL,
  licence     text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE places_local (
  place_id      uuid PRIMARY KEY REFERENCES places (id) ON DELETE CASCADE,
  name_ms       text,
  name_en       text,
  category      text NOT NULL,
  district      text CHECK (district IN ('brunei_muara', 'tutong', 'belait', 'temburong')),
  simpang       text,
  road          text,
  address       text,
  phone         text,
  website       text,
  friday_exempt boolean,
  geom          geography(Point, 4326) NOT NULL,
  status        place_status NOT NULL DEFAULT 'active',
  created_by    uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (name_ms IS NOT NULL OR name_en IS NOT NULL)
);

-- NULL columns mean "use the base value".
CREATE TABLE place_overrides (
  place_id      uuid PRIMARY KEY REFERENCES places (id) ON DELETE CASCADE,
  name_ms       text,
  name_en       text,
  category      text,
  district      text CHECK (district IN ('brunei_muara', 'tutong', 'belait', 'temburong')),
  simpang       text,
  road          text,
  address       text,
  phone         text,
  website       text,
  friday_exempt boolean,
  geom          geography(Point, 4326),
  hidden        boolean NOT NULL DEFAULT false,
  edited_by     uuid REFERENCES users (id) ON DELETE SET NULL,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Several rows per day are allowed, e.g. Friday 07:00-12:00 and 14:00-22:00.
-- day: 0 = Sunday ... 6 = Saturday. Use 24:00 for midnight closing.
CREATE TABLE place_hours (
  id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  place_id uuid NOT NULL REFERENCES places (id) ON DELETE CASCADE,
  day      smallint NOT NULL CHECK (day BETWEEN 0 AND 6),
  opens    time NOT NULL,
  closes   time NOT NULL,
  CHECK (closes > opens)
);

CREATE INDEX places_base_geom_idx     ON places_base USING gist (geom);
CREATE INDEX places_local_geom_idx    ON places_local USING gist (geom);
CREATE INDEX places_local_simpang_idx ON places_local (simpang);
CREATE INDEX place_overrides_simpang_idx ON place_overrides (simpang);
CREATE INDEX place_hours_place_idx    ON place_hours (place_id, day);

CREATE TRIGGER places_local_updated_at BEFORE UPDATE ON places_local
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER place_overrides_updated_at BEFORE UPDATE ON place_overrides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE VIEW places_effective AS
SELECT
  p.id,
  p.source,
  p.overture_id,
  p.last_verified_at,
  COALESCE(o.name_ms, l.name_ms)                AS name_ms,
  COALESCE(o.name_en, l.name_en)                AS name_en,
  b.name                                        AS base_name,
  COALESCE(o.category, l.category, b.category) AS category,
  COALESCE(o.district, l.district)              AS district,
  COALESCE(o.simpang, l.simpang)                AS simpang,
  COALESCE(o.road, l.road)                      AS road,
  COALESCE(o.address, l.address, b.address)    AS address,
  COALESCE(o.phone, l.phone, b.phone)          AS phone,
  COALESCE(o.website, l.website, b.website)    AS website,
  COALESCE(o.friday_exempt, l.friday_exempt)    AS friday_exempt,
  COALESCE(o.geom, l.geom, b.geom)              AS geom,
  (o.place_id IS NOT NULL)                      AS has_override,
  -- Text matched by search. A base name replaced by an override is not searchable.
  lower(concat_ws(' ',
    COALESCE(o.name_ms, l.name_ms),
    COALESCE(o.name_en, l.name_en),
    CASE WHEN o.name_ms IS NULL AND o.name_en IS NULL THEN b.name END
  ))                                            AS search_name
FROM places p
LEFT JOIN places_base     b ON b.place_id = p.id
LEFT JOIN places_local    l ON l.place_id = p.id
LEFT JOIN place_overrides o ON o.place_id = p.id
WHERE COALESCE(o.hidden, false) = false
  AND (
    (p.source = 'base'  AND b.place_id IS NOT NULL)
    OR (p.source = 'local' AND l.status = 'active')
  );
