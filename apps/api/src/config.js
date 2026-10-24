import { z } from 'zod';

// Only used outside production, so local setup needs no secret.
const DEV_JWT_SECRET = 'dev-only-secret-never-use-in-production-0123456789';

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    CORS_ORIGINS: z
      .string()
      .default('')
      .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean)),
    // Signs the app's sign-in tokens. At least 32 random characters in production.
    JWT_SECRET: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(32, 'JWT_SECRET must be at least 32 characters').optional(),
    ),
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.JWT_SECRET, {
    message: 'JWT_SECRET is required in production',
    path: ['JWT_SECRET'],
  })
  .transform((env) => ({ ...env, JWT_SECRET: env.JWT_SECRET ?? DEV_JWT_SECRET }));

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`);
  console.error(`Invalid environment configuration:\n${problems.join('\n')}`);
  process.exit(1);
}

export const config = parsed.data;
