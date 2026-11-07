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
    PORT: z.coerce.number().int().min(1).max(65535).default(4005),
    RABBITMQ_URL: z
      .string()
      .url()
      .default('amqp://guest:guest@localhost:5672'),
    EMAIL_USER: z.string().email().optional(),
    EMAIL_APP_PASSWORD: z.string().min(1).optional(),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
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
    EMAIL_USER: normalizeEmailSetting(cleaned.EMAIL_USER),
    EMAIL_APP_PASSWORD: normalizeAppPassword(cleaned.EMAIL_APP_PASSWORD),
  });
  if (!result.success)
    throw new Error(
      `Invalid environment configuration: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`,
    );
  return result.data;
}

export const env = parseEnvironment(process.env);

