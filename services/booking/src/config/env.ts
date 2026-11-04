import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4003),
    DATABASE_URL: z
      .string()
      .url()
      .refine(
        (value) => /^postgres(ql)?:\/\//.test(value),
        'Use a PostgreSQL connection URL',
      ),
    JWT_SECRET: z.string().min(32).default('default-jwt-secret-for-booking-min-32-chars-long'),
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
    DATABASE_URL: source.DATABASE_URL_BOOKING || source.DATABASE_URL,
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

