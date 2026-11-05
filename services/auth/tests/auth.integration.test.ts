import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { lastTestVerificationCode } from '../src/amqp/publisher.js';

const app = createApp();
const runId = randomUUID();
const customerEmail = `customer-${runId}@auth.orderfirst.test`;
const adminEmail = `admin-${runId}@auth.orderfirst.test`;

const customer = request.agent(app);
const admin = request.agent(app);
const csrf = { 'X-OrderFirst-Request': '1' };

function bodyData(response: request.Response): Record<string, unknown> {
  const body: unknown = response.body;
  expect(body).toHaveProperty('success', true);
  if (
    !body ||
    typeof body !== 'object' ||
    !('data' in body) ||
    !body.data ||
    typeof body.data !== 'object' ||
    Array.isArray(body.data)
  )
    throw new Error('Expected resource response');
  return Object.fromEntries(Object.entries(body.data));
}

describe('Auth Service API Integration', () => {
  beforeAll(async () => {
    try {
      await prisma.$connect();
      const passwordHash = await bcrypt.hash('password123', 12);
      await prisma.user.create({
        data: {
          name: 'Auth Admin',
          email: adminEmail,
          passwordHash,
          role: 'ADMIN',
          emailVerifiedAt: new Date(),
        },
      });
    } catch {
      // Allow running in environments where DB is not yet running
    }
  });

  afterAll(async () => {
    try {
      await prisma.emailVerificationCode.deleteMany({
        where: { user: { email: { in: [customerEmail, adminEmail] } } },
      });
      await prisma.user.deleteMany({
        where: { email: { in: [customerEmail, adminEmail] } },
      });
      await prisma.$disconnect();
    } catch {
      // Ignore cleanup error if DB not connected
    }
  });

  it('responds to health checks', async () => {
    const health = await request(app).get('/health').expect(200);
    expect(health.body).toEqual({ status: 'ok', service: 'auth' });
  });

  it('rejects unauthenticated access to /auth/me', async () => {
    await request(app)
      .get('/auth/me')
      .set(csrf)
      .expect(401);
  });

  it('allows registering a new customer', async () => {
    const res = await customer
      .post('/auth/register')
      .set(csrf)
      .send({
        name: 'Auth Test Customer',
        email: customerEmail,
        password: 'password123',
      })
      .expect(201);

    const data = bodyData(res);
    expect(data.name).toBe('Auth Test Customer');
    expect(data.email).toBe(customerEmail);
    expect(data.emailVerifiedAt).toBeNull();
  });

  it('verifies the customer with email verification code', async () => {
    const code = lastTestVerificationCode;
    expect(code).toBeDefined();

    const res = await customer
      .post('/auth/verify-email')
      .set(csrf)
      .send({ code })
      .expect(200);

    const data = bodyData(res);
    expect(data.emailVerifiedAt).not.toBeNull();
  });

  it('returns profile via /auth/me for logged in user', async () => {
    const res = await customer
      .get('/auth/me')
      .set(csrf)
      .expect(200);

    const data = bodyData(res);
    expect(data.email).toBe(customerEmail);
  });

  it('logs out successfully', async () => {
    await customer
      .post('/auth/logout')
      .set(csrf)
      .expect(200);

    await customer
      .get('/auth/me')
      .set(csrf)
      .expect(401);
  });

  it('logs in with valid credentials', async () => {
    const res = await customer
      .post('/auth/login')
      .set(csrf)
      .send({ email: customerEmail, password: 'password123' })
      .expect(200);

    const data = bodyData(res);
    expect(data.email).toBe(customerEmail);
  });

  it('rejects login with invalid credentials', async () => {
    await request(app)
      .post('/auth/login')
      .set(csrf)
      .send({ email: customerEmail, password: 'wrongpassword' })
      .expect(401);
  });
});

