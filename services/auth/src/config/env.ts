import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env from current directory or traverse upward to the monorepo root
for (const dir of [process.cwd(), path.resolve(process.cwd(), '..'), path.resolve(process.cwd(), '../..')]) {
  const envFile = path.join(dir, '.env');
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
    break;
  }
}

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4001),
    DATABASE_URL: z
      .string()
      .url()
      .refine(
        (value) => /^postgres(ql)?:\/\//.test(value),
        'Use a PostgreSQL connection URL',
      ),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.coerce.number().int().min(60).max(604800).default(86400),
    FRONTEND_URL: z.string().url().refine((value) => {
      const url = new URL(value);
      return (
        ['http:', 'https:'].includes(url.protocol) &&
        url.pathname === '/' &&
        !url.search &&
        !url.hash &&
        !url.username &&
        !url.password
      );
    }, 'Use a single http(s) origin without a path'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
    INTERNAL_SECRET: z.string().min(16).optional(),
    RABBITMQ_URL: z.string().url().default('amqp://guest:guest@localhost:5672'),
    RATE_LIMIT_ENABLED: z
      .preprocess((val) => {
        if (val === undefined || val === null || val === '') return undefined;
        if (typeof val === 'string') {
          const trimmed = val.trim().toLowerCase();
          if (trimmed === 'false' || trimmed === '0' || trimmed === 'off' || trimmed === 'no') return false;
          if (trimmed === 'true' || trimmed === '1' || trimmed === 'on' || trimmed === 'yes') return true;
          return undefined;
        }
        if (typeof val === 'boolean') return val;
        return undefined;
      }, z.boolean().optional()),
  })
  .superRefine((values, context) => {
    if (values.NODE_ENV === 'production') {
      if (!values.FRONTEND_URL.startsWith('https://'))
        context.addIssue({
          code: 'custom',
          path: ['FRONTEND_URL'],
          message: 'Production requires HTTPS',
        });
      if (values.JWT_SECRET.startsWith('replace-'))
        context.addIssue({
          code: 'custom',
          path: ['JWT_SECRET'],
          message: 'Replace the example secret before production',
        });
    }
  });

function cleanEmptyStrings(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const cleaned: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed !== '') {
        cleaned[key] = trimmed;
      }
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function normalizeEmailSetting(value: string | undefined) {
  const v = value?.trim().replace(/^["']|["']$/g, '');
  return v ? v : undefined;
}

function normalizeAppPassword(value: string | undefined) {
  const v = value
    ?.trim()
    .replace(/^["']|["']$/g, '')
    .replaceAll(/\s/g, '');
  return v ? v : undefined;
}

export function parseEnvironment(source: NodeJS.ProcessEnv) {
  const cleaned = cleanEmptyStrings(source);
  const result = envSchema.safeParse({
    ...cleaned,
    DATABASE_URL: cleaned.DATABASE_URL || cleaned.DATABASE_URL_AUTH,
    EMAIL_USER: normalizeEmailSetting(cleaned.EMAIL_USER),
    EMAIL_APP_PASSWORD: normalizeAppPassword(cleaned.EMAIL_APP_PASSWORD),
  });
  if (!result.success)
    throw new Error(
      `Invalid environment configuration: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`,
    );
  const isProduction = result.data.NODE_ENV === 'production';
  return {
    ...result.data,
    RATE_LIMIT_ENABLED: result.data.RATE_LIMIT_ENABLED ?? isProduction,
    FRONTEND_URL: new URL(result.data.FRONTEND_URL).origin,
  };
}

export const env = parseEnvironment(process.env);

