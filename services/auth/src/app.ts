import { randomUUID } from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { logger, errorContext } from './config/logger.js';
import { requestContext } from './config/context.js';
import { AppError } from './errors/app-error.js';
import { errorHandler } from './middlewares/error-handler.js';
import { protectCookieRequests } from './middlewares/security.js';
import { authRouter } from './modules/auth/auth.route.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY_HOPS);

  app.use((request, response, next) => {
    const incomingId = request.headers['x-request-id'];
    const requestId =
      typeof incomingId === 'string' && incomingId.trim().length > 0
        ? incomingId.trim()
        : randomUUID();
    request.requestId = requestId;
    response.setHeader('X-Request-Id', requestId);
    const started = performance.now();
    response.on('finish', () =>
      logger.info(
        {
          requestId,
          method: request.method,
          statusCode: response.statusCode,
          durationMs: Math.round(performance.now() - started),
        },
        'Request completed',
      ),
    );
    requestContext.run({ requestId }, () => next());
  });

  app.use(helmet());

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || origin === env.FRONTEND_URL) callback(null, true);
        else
          callback(
            new AppError(403, 'Origin is not allowed', 'ORIGIN_NOT_ALLOWED'),
          );
      },
      credentials: true,
      methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'X-OrderFirst-Request',
        'X-Internal-Secret',
        'X-User-Id',
        'X-User-Role',
      ],
    }),
  );

  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());
  app.use(protectCookieRequests);

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok', service: 'auth' });
  });

  app.get('/health/ready', async (_request, response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      response.json({ status: 'ready', service: 'auth' });
    } catch (error) {
      logger.error(
        { error: errorContext(error) },
        'Readiness database check failed',
      );
      response
        .status(503)
        .json({ status: 'unavailable', service: 'auth' });
    }
  });

  const router = authRouter();
  app.use('/auth', router);
  app.use('/api/auth', router);

  app.use(() => {
    throw new AppError(404, 'Route not found', 'ROUTE_NOT_FOUND');
  });

  app.use(errorHandler);

  return app;
}

