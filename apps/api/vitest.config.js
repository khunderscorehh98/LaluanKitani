import { defineConfig } from 'vitest/config';

// Credentials come from the git-ignored .env, never from this file.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env: rely on variables already set (e.g. in CI).
}

const { TEST_DATABASE_URL } = process.env;
if (!TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
}

export default defineConfig({
  test: {
    include: ['test/**/*.test.js'],
    globalSetup: ['test/global-setup.js'],
    // API tests share one database, so run files one at a time.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: TEST_DATABASE_URL,
      TEST_DATABASE_URL,
    },
  },
});
