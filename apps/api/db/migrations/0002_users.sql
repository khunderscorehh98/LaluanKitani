-- Minimal accounts. No real names, IC numbers, dates of birth, phone numbers
-- or contacts: no feature needs them.
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'warned', 'banned', 'deleted');

CREATE TABLE users (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            citext UNIQUE,
  auth_provider    text NOT NULL CHECK (auth_provider IN ('google', 'apple', 'email')),
  provider_subject text,
  nickname         text UNIQUE CHECK (char_length(nickname) BETWEEN 3 AND 30),
  language         text NOT NULL DEFAULT 'ms' CHECK (language IN ('ms', 'en')),
  role             user_role NOT NULL DEFAULT 'user',
  status           user_status NOT NULL DEFAULT 'active',
  banned_until     timestamptz,
  reputation       integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_active_at   timestamptz,
  UNIQUE (auth_provider, provider_subject)
);
