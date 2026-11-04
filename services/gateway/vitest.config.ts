import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'gateway-test-only-secret-at-least-32-characters',
      INTERNAL_SECRET: 'internal-secret-for-tests-min-16-chars',
      FRONTEND_URL: 'http://localhost:5173',
      LOG_LEVEL: 'silent',
    },
  },
});

