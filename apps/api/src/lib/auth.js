// Sign-in building blocks: one-time email codes and the app's session tokens.
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

export const CODE_LENGTH = 6;
export const CODE_TTL_MINUTES = 10;
export const MAX_CODE_ATTEMPTS = 5;
// Per email address, to stop the code endpoint being used to spam an inbox
export const MAX_CODES_PER_HOUR = 5;
export const RESEND_AFTER_SECONDS = 30;

const TOKEN_TTL = '90d';
const ALGORITHM = 'HS256';

/** A random 6-digit code, e.g. '042917'. */
export function generateCode() {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
}

/** Codes are stored hashed, tied to the address they were sent to. */
export function hashCode(secret, email, code) {
  return createHmac('sha256', secret).update(`${email.toLowerCase()}:${code}`).digest('hex');
}

export function codeMatches(secret, email, code, storedHash) {
  const given = Buffer.from(hashCode(secret, email, code), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return given.length === stored.length && timingSafeEqual(given, stored);
}

const key = (secret) => new TextEncoder().encode(secret);

/** Signed token for the app. It names the user and the session it belongs to. */
export function signSessionToken(secret, { userId, sessionId }) {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(key(secret));
}

/** { userId, sessionId }, or null when the token is invalid or expired. */
export async function verifySessionToken(secret, token) {
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: [ALGORITHM] });
    return payload.sub && payload.sid ? { userId: payload.sub, sessionId: payload.sid } : null;
  } catch {
    return null;
  }
}

// Shown publicly on reports, so: lower-case letters, digits and underscores only
export const NICKNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
