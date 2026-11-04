import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'orderfirst-gateway' },
  redact: {
    paths: [
      'password',
      'passwordHash',
      'token',
      'secret',
      'cookies',
      'authorization',
      'req.headers',
      'req.body',
    ],
    censor: '[REDACTED]',
  },
});

export function errorContext(error: unknown) {
  return error instanceof Error
    ? {
        name: error.name,
        code:
          'code' in error && typeof error.code === 'string'
            ? error.code
            : undefined,
        stack: error.stack
          ?.split('\n')
          .filter((line) => /^\s+at .+:\d+:\d+\)?$/.test(line))
          .join('\n'),
      }
    : { name: 'UnknownError' };
}

