import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

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

