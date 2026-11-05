import { describe, it, expect, vi } from 'vitest';
import type { Response } from 'express';
import {
  registerRequest,
  loginRequest,
  verifyEmailRequest,
  resendVerificationRequest,
} from '../src/modules/auth/auth.validation.js';
import {
  setSessionCookie,
  verifySession,
} from '../src/modules/auth/auth.session.js';
import { parseEnvironment } from '../src/config/env.js';

const resourceId = '10000000-0000-4000-8000-000000000001';

describe('Auth validation and session invariants', () => {
  it('normalizes registration and rejects privilege escalation', () => {
    expect(
      registerRequest.parse({
        body: {
          name: ' Alex ',
          email: ' ALEX@example.com ',
          password: 'password123',
        },
      }).body,
    ).toEqual({
      name: 'Alex',
      email: 'alex@example.com',
      password: 'password123',
    });

    expect(
      registerRequest.safeParse({
        body: {
          name: 'Alex',
          email: 'alex@example.com',
          password: 'password123',
          role: 'ADMIN',
        },
      }).success,
    ).toBe(false);
  });

  it('validates email and bcrypt UTF-8 byte limits', () => {
    for (const body of [
      { name: 'Alex', email: 'broken', password: 'password123' },
      { name: 'Alex', email: 'alex@example.com', password: '123' },
      { name: 'Alex', email: 'alex@example.com', password: '🙂'.repeat(19) },
    ]) {
      expect(registerRequest.safeParse({ body }).success).toBe(false);
    }
  });

  it('validates login request payload', () => {
    expect(
      loginRequest.safeParse({
        body: { email: 'alex@example.com', password: 'password123' },
      }).success,
    ).toBe(true);

    expect(
      loginRequest.safeParse({
        body: { email: 'invalid-email', password: 'password123' },
      }).success,
    ).toBe(false);

    expect(
      loginRequest.safeParse({
        body: { email: 'alex@example.com', password: 'short' },
      }).success,
    ).toBe(false);
  });

  it('validates verification codes as exactly six digits', () => {
    expect(
      verifyEmailRequest.parse({ body: { code: '123456' } }).body.code,
    ).toBe('123456');

    for (const code of ['12345', '1234567', '12ab56', '']) {
      expect(verifyEmailRequest.safeParse({ body: { code } }).success).toBe(
        false,
      );
    }
  });

  it('validates resend verification request body', () => {
    expect(resendVerificationRequest.safeParse({ body: {} }).success).toBe(true);
    expect(
      resendVerificationRequest.safeParse({ body: { extra: true } }).success,
    ).toBe(false);
  });

  it('fails fast for missing environment or unsafe production configuration', () => {
    expect(() => parseEnvironment({})).toThrow(
      'Invalid environment configuration',
    );
    expect(() =>
      parseEnvironment({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost/db',
        JWT_SECRET: 'replace-with-a-random-secret-at-least-32-characters',
        FRONTEND_URL: 'http://localhost:5173',
        EMAIL_USER: 'admin@example.com',
        EMAIL_APP_PASSWORD: 'app-password',
      }),
    ).toThrow('Production requires HTTPS');
  });

  it('issues an HTTP-only expiring JWT cookie and rejects tampered tokens', () => {
    const cookie = vi.fn();
    const response = { cookie } as unknown as Response;
    setSessionCookie(response, resourceId);
    const token: unknown = cookie.mock.calls[0]?.[1];
    expect(typeof token).toBe('string');
    if (typeof token !== 'string') throw new Error('Missing cookie token');
    expect(verifySession(token)).toBe(resourceId);
    expect(verifySession(token + 'tampered')).toBeUndefined();
    expect(cookie.mock.calls[0]?.[2]).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 86400000,
    });
  });

  it('does not log sensitive multiline error messages as stack traces', async () => {
    const { errorContext } = await import('../src/config/logger.js');
    const error = new Error(
      'Database invocation failed\npasswordHash: sensitive-value\nCookie: sensitive-token',
    );
    const serialized = JSON.stringify(errorContext(error));
    expect(serialized).not.toContain('sensitive-value');
    expect(serialized).not.toContain('sensitive-token');
    expect(errorContext(error).stack).toContain('auth.unit.test.ts');
  });
});

