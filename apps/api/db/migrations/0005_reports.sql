-- Driver reports. Routing effect and expiry per label live in src/lib/reports.js.
CREATE TYPE report_label  AS ENUM ('careful', 'jammed', 'danger', 'flooded', 'closed');
CREATE TYPE report_status AS ENUM ('active', 'expired', 'cleared', 'removed');
CREATE TYPE report_vote   AS ENUM ('still_there', 'gone');

CREATE TABLE reports (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label              report_label NOT NULL,
  description        varchar(140),
  description_hidden boolean NOT NULL DEFAULT false,
  geom               geography(Point, 4326) NOT NULL,
  road_name          text,
  -- Kept but anonymised when the reporter deletes their account.
  user_id            uuid REFERENCES users (id) ON DELETE SET NULL,
  status             report_status NOT NULL DEFAULT 'active',
  created_at         timestamptz NOT NULL DEFAULT now(),
  -- NULL: stays until drivers vote it cleared (Flooded, Closed).
  expires_at         timestamptz,
  ended_at           timestamptz,
  removed_reason     text
);

CREATE INDEX reports_geom_idx   ON reports USING gist (geom);
CREATE INDEX reports_status_idx ON reports (status, expires_at);

-- One vote per driver per report. Reporters cannot vote on their own reports
-- (enforced by the API).
CREATE TABLE report_votes (
  report_id  uuid NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  vote       report_vote NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (report_id, user_id)
);

CREATE VIEW reports_live AS
SELECT
  r.*,
  (COUNT(v.user_id) FILTER (WHERE v.vote = 'still_there'))::int AS still_there_count,
  (COUNT(v.user_id) FILTER (WHERE v.vote = 'gone'))::int        AS gone_count
FROM reports r
LEFT JOIN report_votes v ON v.report_id = r.id
WHERE r.status = 'active'
  AND (r.expires_at IS NULL OR r.expires_at > now())
GROUP BY r.id;
