-- Driver "Add missing place" and "Fix this place" submissions, reviewed by moderators.
CREATE TYPE suggestion_type AS ENUM ('new_place', 'fix_place');
CREATE TYPE review_status   AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE place_suggestions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES users (id) ON DELETE SET NULL,
  type          suggestion_type NOT NULL,
  place_id      uuid REFERENCES places (id) ON DELETE CASCADE,
  payload       jsonb NOT NULL,
  note          text,
  status        review_status NOT NULL DEFAULT 'pending',
  reviewed_by   uuid REFERENCES users (id) ON DELETE SET NULL,
  reviewed_at   timestamptz,
  reject_reason text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK ((type = 'fix_place') = (place_id IS NOT NULL))
);

CREATE INDEX place_suggestions_status_idx ON place_suggestions (status, created_at);

-- Every admin and moderator change, with what it was before.
-- Entries cannot be edited or deleted.
CREATE TABLE audit_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id    uuid REFERENCES users (id) ON DELETE SET NULL,
  action      text NOT NULL,
  target_type text NOT NULL,
  target_id   text NOT NULL,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_created_idx ON audit_log (created_at DESC);
CREATE INDEX audit_log_target_idx  ON audit_log (target_type, target_id);

CREATE FUNCTION audit_log_is_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log entries cannot be changed or deleted';
END;
$$;

CREATE TRIGGER audit_log_no_update BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_is_append_only();
CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_is_append_only();
