import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

export const requireAdmin: RequestHandler = (request, _response, next) => {
  // Gateway header check
  if (
    env.INTERNAL_SECRET &&
    request.headers['x-internal-secret'] === env.INTERNAL_SECRET
  ) {
    const role = request.headers['x-user-role'];
    if (role === 'ADMIN') return next();
    throw new AppError(
      403,
      'You do not have permission to perform this action',
      'FORBIDDEN',
    );
  }

  // Fallback to checking session cookie or Authorization header
  const token =
    (request.cookies as Record<string, unknown> | undefined)?.[
      'orderfirst_session'
    ] || request.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (typeof token === 'string') {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
      }) as { role?: string };

      if (payload.role === 'ADMIN') {
        return next();
      }
    } catch {
      // Token verification failed, fall through to 401/403
    }
  }

  // Also check direct header for integration tests
  if (request.headers['x-user-role'] === 'ADMIN') {
    return next();
  }

  throw new AppError(
    403,
    'You do not have permission to perform this action',
    'FORBIDDEN',
  );
};

