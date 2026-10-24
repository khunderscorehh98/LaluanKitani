-- Sign-in with an emailed 6-digit code. Codes are stored hashed and expire
-- after a few minutes; each one can be used once.
CREATE TABLE email_login_codes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      citext NOT NULL,
  code_hash  text NOT NULL,
  attempts   integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_login_codes_email_idx ON email_login_codes (email, created_at DESC);

-- One row per signed-in device. The app's token names its session, so a
-- session can be signed out (revoked) without waiting for the token to expire.
CREATE TABLE sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  revoked_at   timestamptz
);

CREATE INDEX sessions_user_idx ON sessions (user_id);
