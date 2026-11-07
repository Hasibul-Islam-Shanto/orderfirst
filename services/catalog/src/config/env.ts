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
    PORT: z.coerce.number().int().min(1).max(65535).default(4002),
    DATABASE_URL: z
      .string()
      .url()
      .refine(
        (value) => /^postgres(ql)?:\/\//.test(value),
        'Use a PostgreSQL connection URL',
      ),
    JWT_SECRET: z.string().min(32).default('default-jwt-secret-for-catalog-min-32-chars-long'),
    FRONTEND_URL: z.string().url().default('http://localhost:5173'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
    INTERNAL_SECRET: z.string().min(16).optional(),
  });

export function parseEnvironment(source: NodeJS.ProcessEnv) {
  const result = envSchema.safeParse({
    ...source,
    DATABASE_URL: source.DATABASE_URL || source.DATABASE_URL_CATALOG,
  });
  if (!result.success)
    throw new Error(
      `Invalid environment configuration: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`,
    );
  return {
    ...result.data,
    FRONTEND_URL: new URL(result.data.FRONTEND_URL).origin,
  };
}

export const env = parseEnvironment(process.env);

