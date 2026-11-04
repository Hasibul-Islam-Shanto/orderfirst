import jwt from 'jsonwebtoken';
import type { CookieOptions, Response } from 'express';
import { env } from '../../config/env.js';

export const sessionCookieName = 'orderfirst_session';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

export function setSessionCookie(response: Response, userId: string) {
  const token = jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: 'HS256',
    issuer: 'orderfirst-api',
    audience: 'orderfirst-web',
  });
  response.cookie(sessionCookieName, token, {
    ...cookieOptions,
    maxAge: env.JWT_EXPIRES_IN * 1000,
  });
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(sessionCookieName, cookieOptions);
}

export function verifySession(token: string): string | undefined {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'orderfirst-api',
      audience: 'orderfirst-web',
    });
    return typeof payload === 'object' && typeof payload.sub === 'string'
      ? payload.sub
      : undefined;
  } catch {
    return undefined;
  }
}

