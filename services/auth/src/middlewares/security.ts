import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

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

export function createAuthRateLimit(): RequestHandler {
  if (!env.RATE_LIMIT_ENABLED) {
    return (_request, _response, next) => next();
  }

  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.NODE_ENV === 'test' ? 1000 : 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_request, response) => {
      response.status(429).json({
        success: false,
        message: 'Too many authentication attempts. Please try again later.',
        code: 'RATE_LIMITED',
      });
    },
  });
}

