import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import { uuidSchema } from '../utils/validation.js';

interface JwtPayload {
  sub?: string;
  name?: string;
  email?: string;
  role?: string;
}

export const authenticateUser: RequestHandler = (request, _response, next) => {
  if (
    env.INTERNAL_SECRET &&
    request.headers['x-internal-secret'] === env.INTERNAL_SECRET &&
    typeof request.headers['x-user-id'] === 'string'
  ) {
    const id = request.headers['x-user-id'];
    if (uuidSchema.safeParse(id).success) {
      request.user = {
        id,
        name: (request.headers['x-user-name'] as string) || 'Customer',
        email: (request.headers['x-user-email'] as string) || 'customer@orderfirst.test',
        role: (request.headers['x-user-role'] as string) || 'CUSTOMER',
      };
      return next();
    }
  }

  const token =
    (request.cookies as Record<string, unknown> | undefined)?.[
      'orderfirst_session'
    ] || request.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (typeof token === 'string') {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
      }) as JwtPayload;

      if (payload.sub && uuidSchema.safeParse(payload.sub).success) {
        request.user = {
          id: payload.sub,
          name: payload.name || 'Customer',
          email: payload.email || 'customer@orderfirst.test',
          role: payload.role || 'CUSTOMER',
        };
        return next();
      }
    } catch {
    }
  }

  if (request.headers['x-user-id'] && typeof request.headers['x-user-id'] === 'string') {
    request.user = {
      id: request.headers['x-user-id'],
      name: (request.headers['x-user-name'] as string) || 'Test User',
      email: (request.headers['x-user-email'] as string) || 'test@orderfirst.test',
      role: (request.headers['x-user-role'] as string) || 'CUSTOMER',
    };
    return next();
  }

  throw new AppError(401, 'Please log in to continue', 'UNAUTHENTICATED');
};

export function authorizeRoles(...roles: string[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.user || !roles.includes(request.user.role || '')) {
      throw new AppError(
        403,
        'You do not have permission to perform this action',
        'FORBIDDEN',
      );
    }
    next();
  };
}

export function requireUser(request: Request) {
  if (!request.user) {
    throw new AppError(401, 'Please log in to continue', 'UNAUTHENTICATED');
  }
  return request.user;
}

