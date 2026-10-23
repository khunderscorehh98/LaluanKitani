-- Local names people search for. Each alias points to one place.
CREATE TABLE place_aliases (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id   uuid NOT NULL REFERENCES places (id) ON DELETE CASCADE,
  alias      text NOT NULL CHECK (char_length(alias) BETWEEN 2 AND 120),
  language   text NOT NULL CHECK (language IN ('ms', 'en')),
  source     text NOT NULL CHECK (source IN ('base_map', 'moderator', 'suggestion')),
  status     place_status NOT NULL DEFAULT 'active',
  added_by   uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- An active alias can belong to only one place.
CREATE UNIQUE INDEX place_aliases_unique_active_idx ON place_aliases (lower(alias)) WHERE status = 'active';
CREATE INDEX place_aliases_place_idx ON place_aliases (place_id);
CREATE INDEX place_aliases_trgm_idx  ON place_aliases USING gin (lower(alias) gin_trgm_ops);

-- Curated intent table: when someone searches a need instead of a place
-- (e.g. "passport"), show these place categories.
CREATE TABLE intents (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  need       text NOT NULL UNIQUE,
  keywords   text[] NOT NULL CHECK (cardinality(keywords) > 0),
  categories text[] NOT NULL CHECK (cardinality(categories) > 0),
  created_by uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER intents_updated_at BEFORE UPDATE ON intents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Searches that found nothing, logged anonymously (no user id, no location)
-- to decide which intents and aliases to add.
CREATE TABLE search_misses (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  query      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
