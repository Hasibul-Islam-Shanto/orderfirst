import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      RABBITMQ_URL: 'amqp://guest:guest@localhost:5672',
      LOG_LEVEL: 'silent',
    },
  },
});

