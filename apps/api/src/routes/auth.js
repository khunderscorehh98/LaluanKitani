// Sign-in with a 6-digit code sent by email. Google and Apple sign-in come
// later, once the app has its OAuth client IDs.
import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { CODE_LENGTH, NICKNAME_PATTERN } from '../lib/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { revokeSession, setNickname, startEmailSignIn, verifyEmailSignIn } from '../services/auth.js';

export const authRouter = Router();
export const meRouter = Router();

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);

// POST /v1/auth/email/start { email }
authRouter.post('/email/start', validateBody(z.object({ email })), async (req, res) => {
  const { email: address } = req.valid.body;
  const { code, expiresInSeconds } = await startEmailSignIn(address);

  // No email provider yet. Outside production the code is logged and returned
  // so the app (and tests) can sign in; production must send it by email.
  const devMode = config.NODE_ENV !== 'production';
  if (devMode) logger.info({ email: address, code }, 'sign-in code (development only, not emailed)');

  res.status(202).json({ sent: true, expires_in: expiresInSeconds, ...(devMode && { dev_code: code }) });
});

// POST /v1/auth/email/verify { email, code }
const verifyBody = z.object({
  email,
  code: z.string().trim().regex(new RegExp(`^\\d{${CODE_LENGTH}}$`), `The code has ${CODE_LENGTH} digits`),
});

authRouter.post('/email/verify', validateBody(verifyBody), async (req, res) => {
  const { token, user, isNewAccount } = await verifyEmailSignIn(req.valid.body.email, req.valid.body.code);
  // New accounts (and old ones without one) pick a nickname before reporting
  res.json({ token, user, new_account: isNewAccount, needs_nickname: !user.nickname });
});

// POST /v1/auth/sign-out — ends this device's session
authRouter.post('/sign-out', requireAuth, async (req, res) => {
  await revokeSession(req.sessionId);
  res.status(204).end();
});

// GET /v1/me
meRouter.get('/', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// PATCH /v1/me { nickname }
const meBody = z.object({
  nickname: z
    .string()
    .trim()
    .toLowerCase()
    .regex(NICKNAME_PATTERN, '3 to 30 characters: letters, numbers and _ only'),
});

meRouter.patch('/', requireAuth, validateBody(meBody), async (req, res) => {
  res.json({ user: await setNickname(req.user.id, req.valid.body.nickname) });
});
