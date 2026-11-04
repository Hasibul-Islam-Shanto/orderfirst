import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

export const sessionCookieName = 'orderfirst_session';

export const protectCookieRequests: RequestHandler = (
  request,
  _response,
  next,
) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const origin = request.get('origin');
    if (
      (origin && origin !== env.FRONTEND_URL) ||
      request.get('x-orderfirst-request') !== '1'
    )
      throw new AppError(
        403,
        'Send this request from the configured frontend with X-OrderFirst-Request: 1',
        'CSRF_REJECTED',
      );
  }
  next();
};

export function createIpRateLimit() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.NODE_ENV === 'test' ? 1000 : 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_request, response) => {
      response.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        code: 'RATE_LIMITED',
      });
    },
  });
}

export const extractSession: RequestHandler = (request, _response, next) => {
  const token =
    (request.cookies as Record<string, unknown> | undefined)?.[sessionCookieName] ||
    request.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (typeof token === 'string') {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
      }) as { sub?: string; role?: string; name?: string; email?: string };

      if (payload.sub) {
        request.user = {
          id: payload.sub,
          role: payload.role || 'CUSTOMER',
          name: payload.name,
          email: payload.email,
        };
      }
    } catch {
      // Ignore invalid session on public paths; downstream / guard will check if required
    }
  }
  next();
};

export const requireAdmin: RequestHandler = (request, _response, next) => {
  if (!request.user || request.user.role !== 'ADMIN') {
    throw new AppError(403, 'You do not have permission to perform this action', 'FORBIDDEN');
  }
  next();
};

