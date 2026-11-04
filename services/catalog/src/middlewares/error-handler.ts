import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';
import { logger, errorContext } from '../config/logger.js';

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  request,
  response,
  _next,
) => {
  if (response.headersSent) {
    _next(error);
    return;
  }
  if (error instanceof ZodError) {
    response.status(400).json({
      success: false,
      message: 'Please correct the highlighted request fields',
      code: 'VALIDATION_ERROR',
      errors: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }
  if (error instanceof AppError) {
    if (error.statusCode === 409)
      logger.warn(
        { requestId: request.requestId, code: error.code },
        'Resource conflict',
      );
    response
      .status(error.statusCode)
      .json({ success: false, message: error.message, code: error.code });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped: Record<string, [number, string, string]> = {
      P2002: [
        409,
        'A resource with these unique values already exists',
        'DUPLICATE_VALUE',
      ],
      P2003: [
        409,
        'This resource is referenced by existing records or its related resource is missing',
        'RELATION_CONFLICT',
      ],
      P2025: [404, 'Resource not found', 'NOT_FOUND'],
      P2004: [
        409,
        'This change conflicts with a database constraint',
        'CONSTRAINT_CONFLICT',
      ],
    };
    const result = mapped[error.code];
    if (result) {
      logger.warn(
        { requestId: request.requestId, code: error.code },
        'Database constraint rejected request',
      );
      response
        .status(result[0])
        .json({ success: false, message: result[1], code: result[2] });
      return;
    }
  }
  if (
    error &&
    typeof error === 'object' &&
    'type' in error &&
    (error.type === 'entity.parse.failed' || error.type === 'entity.too.large')
  ) {
    response.status(error.type === 'entity.too.large' ? 413 : 400).json({
      success: false,
      message:
        error.type === 'entity.too.large'
          ? 'Request body is too large'
          : 'Request body must contain valid JSON',
      code: 'INVALID_BODY',
    });
    return;
  }
  logger.error(
    {
      error: errorContext(error),
      requestId: request.requestId,
    },
    'Unexpected request failure',
  );
  response.status(500).json({
    success: false,
    message: 'An unexpected error occurred. Please try again later.',
    code: 'INTERNAL_ERROR',
  });
};

