import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { parseEnvironment } from '../src/config/env.js';
import { createIpRateLimit } from '../src/middlewares/security.js';

describe('Gateway environment and rate limiting configuration', () => {
  it('correctly defaults and parses RATE_LIMIT_ENABLED for development and production', () => {
    const baseDev = {};
    const baseProd = {
      NODE_ENV: 'production',
      JWT_SECRET: 'a'.repeat(32),
      FRONTEND_URL: 'https://app.orderfirst.dev',
    };

    // Default false in development
    expect(parseEnvironment(baseDev).RATE_LIMIT_ENABLED).toBe(false);

    // Default true in production
    expect(parseEnvironment(baseProd).RATE_LIMIT_ENABLED).toBe(true);

    // Explicit override in development
    expect(
      parseEnvironment({ ...baseDev, RATE_LIMIT_ENABLED: 'true' })
        .RATE_LIMIT_ENABLED,
    ).toBe(true);

    // Explicit override in production
    expect(
      parseEnvironment({ ...baseProd, RATE_LIMIT_ENABLED: 'false' })
        .RATE_LIMIT_ENABLED,
    ).toBe(false);

    // Empty string from docker compose parameter expansion defaults correctly
    expect(
      parseEnvironment({ ...baseDev, RATE_LIMIT_ENABLED: '' })
        .RATE_LIMIT_ENABLED,
    ).toBe(false);
    expect(
      parseEnvironment({ ...baseProd, RATE_LIMIT_ENABLED: '' })
        .RATE_LIMIT_ENABLED,
    ).toBe(true);
  });

  it('returns a no-op passthrough middleware when RATE_LIMIT_ENABLED is false', () => {
    const middleware = createIpRateLimit();
    let nextCalled = false;
    middleware({} as any, {} as any, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
  });

  it('gracefully handles empty-string environment variables without failing validation', () => {
    const parsed = parseEnvironment({
      INTERNAL_SECRET: '',
      JWT_SECRET: '',
      FRONTEND_URL: '',
      RATE_LIMIT_ENABLED: '',
    });
    expect(parsed.INTERNAL_SECRET).toBe('internal-secret-for-microservices-mesh-min-16-chars');
    expect(parsed.FRONTEND_URL).toBe('http://localhost:5173');
    expect(parsed.RATE_LIMIT_ENABLED).toBe(false);
  });
});

describe('Gateway edge security and routes', () => {
  it('responds with 200 on /health', async () => {
    const app = createApp();
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', service: 'gateway' });
  });

  it('rejects mutating requests missing X-OrderFirst-Request with 403', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(403);

    expect(res.body.code).toBe('CSRF_REJECTED');
  });

  it('returns 404 for unknown endpoints', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/api/unknown-endpoint')
      .set('X-OrderFirst-Request', '1')
      .expect(404);

    expect(res.body.code).toBe('ROUTE_NOT_FOUND');
  });
});

