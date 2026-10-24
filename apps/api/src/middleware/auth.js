import { config } from '../config.js';
import { ApiError } from '../lib/errors.js';
import { verifySessionToken } from '../lib/auth.js';
import { userForSession } from '../services/auth.js';

async function signedInUser(req) {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  const claims = await verifySessionToken(config.JWT_SECRET, token);
  if (!claims) return null;
  const user = await userForSession(claims);
  return user ? { user, sessionId: claims.sessionId } : null;
}

/** For endpoints that need an account: sets req.user and req.sessionId, or answers 401. */
export async function requireAuth(req, _res, next) {
  const auth = await signedInUser(req);
  if (!auth) throw new ApiError(401, 'unauthorized', 'Sign in to do this.');
  req.user = auth.user;
  req.sessionId = auth.sessionId;
  next();
}

/** For endpoints that work without an account but say more when signed in. */
export async function optionalAuth(req, _res, next) {
  const auth = await signedInUser(req);
  req.user = auth?.user ?? null;
  req.sessionId = auth?.sessionId ?? null;
  next();
}
