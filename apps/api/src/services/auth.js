import { query } from '../db/pool.js';
import { config } from '../config.js';
import { ApiError } from '../lib/errors.js';
import {
  CODE_TTL_MINUTES,
  MAX_CODE_ATTEMPTS,
  MAX_CODES_PER_HOUR,
  RESEND_AFTER_SECONDS,
  codeMatches,
  generateCode,
  hashCode,
  signSessionToken,
} from '../lib/auth.js';

// What the app may see about the signed-in account. Never includes other users' emails.
const USER_COLUMNS = 'u.id, u.email, u.nickname, u.language, u.role, u.reputation, u.created_at';

export function toUser(row) {
  return {
    id: row.id,
    email: row.email,
    nickname: row.nickname,
    language: row.language,
    role: row.role,
    reputation: row.reputation,
    created_at: row.created_at,
  };
}

/**
 * Creates a sign-in code for `email`. Returns the code so the caller can send
 * it; it is only ever stored hashed.
 */
export async function startEmailSignIn(email) {
  const { rows } = await query(
    `SELECT count(*)::int AS last_hour,
            max(created_at) > now() - make_interval(secs => $2) AS too_soon
     FROM email_login_codes
     WHERE email = $1 AND created_at > now() - interval '1 hour'`,
    [email, RESEND_AFTER_SECONDS],
  );
  if (rows[0].too_soon || rows[0].last_hour >= MAX_CODES_PER_HOUR) {
    throw new ApiError(429, 'too_many_requests', 'Please wait a little before asking for another code.');
  }

  const code = generateCode();
  await query(
    `INSERT INTO email_login_codes (email, code_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(mins => $3))`,
    [email, hashCode(config.JWT_SECRET, email, code), CODE_TTL_MINUTES],
  );
  return { code, expiresInSeconds: CODE_TTL_MINUTES * 60 };
}

const invalidCode = () => new ApiError(400, 'invalid_code', 'That code is wrong or has expired. Ask for a new one.');

/**
 * Checks the latest code sent to `email`. On success, signs the person in
 * (creating their account the first time) and returns a token for the app.
 */
export async function verifyEmailSignIn(email, code) {
  const { rows } = await query(
    `SELECT id, code_hash, attempts FROM email_login_codes
     WHERE email = $1 AND used_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [email],
  );
  const pending = rows[0];
  if (!pending || pending.attempts >= MAX_CODE_ATTEMPTS) throw invalidCode();

  if (!codeMatches(config.JWT_SECRET, email, code, pending.code_hash)) {
    await query('UPDATE email_login_codes SET attempts = attempts + 1 WHERE id = $1', [pending.id]);
    throw invalidCode();
  }

  // Mark used first, so the same code can't sign in twice
  const used = await query(
    'UPDATE email_login_codes SET used_at = now() WHERE id = $1 AND used_at IS NULL RETURNING id',
    [pending.id],
  );
  if (!used.rowCount) throw invalidCode();

  const user = await query(
    `INSERT INTO users AS u (email, auth_provider, last_active_at) VALUES ($1, 'email', now())
     ON CONFLICT (email) DO UPDATE SET last_active_at = now()
     RETURNING ${USER_COLUMNS}, u.status, (xmax = 0) AS created`,
    [email],
  );
  const account = user.rows[0];
  if (account.status === 'banned' || account.status === 'deleted') {
    throw new ApiError(403, 'account_unavailable', 'This account cannot sign in.');
  }

  const session = await query('INSERT INTO sessions (user_id) VALUES ($1) RETURNING id', [account.id]);
  const token = await signSessionToken(config.JWT_SECRET, { userId: account.id, sessionId: session.rows[0].id });
  return { token, user: toUser(account), isNewAccount: account.created };
}

/** The signed-in user for a token's session, or null if it was signed out or the account is blocked. */
export async function userForSession({ userId, sessionId }) {
  const { rows } = await query(
    `UPDATE sessions s SET last_used_at = now()
     FROM users u
     WHERE s.id = $1 AND s.user_id = $2 AND u.id = s.user_id
       AND s.revoked_at IS NULL AND u.status NOT IN ('banned', 'deleted')
     RETURNING ${USER_COLUMNS}`,
    [sessionId, userId],
  );
  return rows[0] ? toUser(rows[0]) : null;
}

export async function revokeSession(sessionId) {
  await query('UPDATE sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL', [sessionId]);
}

export async function setNickname(userId, nickname) {
  try {
    const { rows } = await query(
      `UPDATE users u SET nickname = $2 WHERE id = $1 RETURNING ${USER_COLUMNS}`,
      [userId, nickname],
    );
    return toUser(rows[0]);
  } catch (err) {
    // unique_violation on users.nickname
    if (err.code === '23505') throw new ApiError(409, 'nickname_taken', 'That nickname is already taken.');
    throw err;
  }
}
