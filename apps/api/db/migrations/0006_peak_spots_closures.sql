-- School term dates, set by admins each year. Peak Spots tied to school terms
-- use these to know whether today is a school day.
CREATE TABLE school_calendar (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  term      text NOT NULL CHECK (term IN ('term_1', 'term_2', 'term_3', 'term_4')),
  starts_on date NOT NULL,
  ends_on   date NOT NULL,
  CHECK (ends_on >= starts_on)
);

-- Recurring Peak Spots: zones that get busy at known times. Drivers see them as orange areas.
CREATE TABLE peak_spots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  geom         geography(Polygon, 4326) NOT NULL,
  -- 0 = Sunday ... 6 = Saturday
  days         smallint[] NOT NULL DEFAULT '{1,2,3,4,5}'
               CHECK (cardinality(days) > 0 AND days <@ '{0,1,2,3,4,5,6}'::smallint[]),
  -- Empty: applies all year. Otherwise only during these terms / holidays.
  school_terms text[] NOT NULL DEFAULT '{}'
               CHECK (school_terms <@ '{term_1,term_2,term_3,term_4,school_holidays}'::text[]),
  active       boolean NOT NULL DEFAULT true,
  created_by   uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE peak_spot_windows (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  peak_spot_id uuid NOT NULL REFERENCES peak_spots (id) ON DELETE CASCADE,
  starts       time NOT NULL,
  ends         time NOT NULL,
  CHECK (ends > starts)
);

CREATE INDEX peak_spots_geom_idx ON peak_spots USING gist (geom);
CREATE INDEX peak_spot_windows_spot_idx ON peak_spot_windows (peak_spot_id);

CREATE TRIGGER peak_spots_updated_at BEFORE UPDATE ON peak_spots
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Planned closures (events, road works). Shown on the map and avoided by routing
-- during the set times once published.
CREATE TYPE closure_status AS ENUM ('draft', 'published', 'cancelled');

CREATE TABLE event_closures (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  note         text,
  starts_at    timestamptz NOT NULL,
  ends_at      timestamptz NOT NULL,
  geom         geography(MultiLineString, 4326) NOT NULL,
  road_names   text[] NOT NULL DEFAULT '{}',
  status       closure_status NOT NULL DEFAULT 'draft',
  created_by   uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  CHECK (ends_at > starts_at)
);

CREATE INDEX event_closures_geom_idx ON event_closures USING gist (geom);
CREATE INDEX event_closures_time_idx ON event_closures (status, ends_at);
