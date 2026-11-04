import type { Request, RequestHandler } from 'express';
import type { UserRole } from '@prisma/client';
import { AppError } from '../errors/app-error.js';
import { sessionCookieName, verifySession } from '../modules/auth/auth.session.js';
import { prisma } from '../config/prisma.js';
import { uuidSchema } from '../utils/validation.js';
import { env } from '../config/env.js';

export const authenticateUser: RequestHandler = async (
  request,
  _response,
  next,
) => {
  // If request has valid internal gateway credentials
  if (
    env.INTERNAL_SECRET &&
    request.headers['x-internal-secret'] === env.INTERNAL_SECRET &&
    typeof request.headers['x-user-id'] === 'string'
  ) {
    const internalUserId = request.headers['x-user-id'];
    if (uuidSchema.safeParse(internalUserId).success) {
      const user = await prisma.user.findUnique({
        where: { id: internalUserId },
        select: { id: true, role: true, emailVerifiedAt: true },
      });
      if (user) {
        request.user = user;
        return next();
      }
    }
  }

  const cookies: unknown = request.cookies;
  const token =
    cookies && typeof cookies === 'object' && sessionCookieName in cookies
      ? (cookies as Record<string, unknown>)[sessionCookieName]
      : undefined;

  const userId = typeof token === 'string' ? verifySession(token) : undefined;
  if (!userId || !uuidSchema.safeParse(userId).success)
    throw new AppError(401, 'Please log in to continue', 'UNAUTHENTICATED');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, emailVerifiedAt: true },
  });
  if (!user)
    throw new AppError(
      401,
      'Your session is no longer valid',
      'UNAUTHENTICATED',
    );

  request.user = user;
  next();
};

export function authorizeRoles(...roles: UserRole[]): RequestHandler {
  return (request, _response, next) => {
    const user = requireUser(request);
    if (!roles.includes(user.role))
      throw new AppError(
        403,
        'You do not have permission to perform this action',
        'FORBIDDEN',
      );
    next();
  };
}

export function requireUser(request: Request) {
  if (!request.user)
    throw new AppError(401, 'Please log in to continue', 'UNAUTHENTICATED');
  return request.user;
}

