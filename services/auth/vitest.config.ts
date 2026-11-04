import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/**/*.integration.test.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@127.0.0.1:55432/orderfirst_test?schema=auth',
      JWT_SECRET: 'unit-test-only-secret-at-least-32-characters',
      FRONTEND_URL: 'http://localhost:5173',
      LOG_LEVEL: 'silent',
    },
  },
});

