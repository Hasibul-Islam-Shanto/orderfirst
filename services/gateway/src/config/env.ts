import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    JWT_SECRET: z.string().min(32).default('replace-with-a-random-secret-at-least-32-characters'),
    INTERNAL_SECRET: z.string().min(16).default('internal-secret-for-microservices-mesh-min-16-chars'),
    FRONTEND_URL: z.string().url().default('http://localhost:5173'),
    AUTH_SERVICE_URL: z.string().url().default('http://localhost:4001'),
    CATALOG_SERVICE_URL: z.string().url().default('http://localhost:4002'),
    BOOKING_SERVICE_URL: z.string().url().default('http://localhost:4003'),
    ORDERS_SERVICE_URL: z.string().url().default('http://localhost:4004'),
    NOTIFY_SERVICE_URL: z.string().url().default('http://localhost:4005'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  });

export function parseEnvironment(source: NodeJS.ProcessEnv) {
  const result = envSchema.safeParse(source);
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

