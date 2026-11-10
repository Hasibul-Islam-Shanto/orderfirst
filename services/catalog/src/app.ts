import { randomUUID } from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { logger, errorContext } from './config/logger.js';
import { metrics } from './config/metrics.js';
import { AppError } from './errors/app-error.js';
import { errorHandler } from './middlewares/error-handler.js';
import { menuRouter } from './modules/menu/menu.route.js';
import * as controller from './modules/menu/menu.controller.js';
import * as validation from './modules/menu/menu.validation.js';
import { validateRequest } from './middlewares/validate-request.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY_HOPS);

  app.use((request, response, next) => {
    request.requestId = randomUUID();
    response.setHeader('X-Request-Id', request.requestId);
    const started = performance.now();
    response.on('finish', () =>
      logger.info(
        {
          requestId: request.requestId,
          method: request.method,
          statusCode: response.statusCode,
          durationMs: Math.round(performance.now() - started),
        },
        'Request completed',
      ),
    );
    next();
  });

  app.use(metrics.metricsMiddleware);

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

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok', service: 'catalog' });
  });

  app.get(['/metrics', '/metrices'], async (_request, response) => {
    response.setHeader('Content-Type', metrics.register.contentType);
    response.send(await metrics.register.metrics());
  });

  app.get('/health/ready', async (_request, response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      response.json({ status: 'ready', service: 'catalog' });
    } catch (error) {
      logger.error(
        { error: errorContext(error) },
        'Readiness database check failed',
      );
      response
        .status(503)
        .json({ status: 'unavailable', service: 'catalog' });
    }
  });

  // Internal mesh route (unauthenticated for internal mesh)
  app.post(
    '/internal/menu-items/batch',
    validateRequest(validation.batchLookupRequest, controller.getBatchMenuItems),
  );

  // Menu routes
  app.use('/menu', menuRouter);
  app.use('/api/menu', menuRouter);
  app.use('/admin/menu', menuRouter);
  app.use('/api/admin/menu', menuRouter);

  app.use(() => {
    throw new AppError(404, 'Route not found', 'ROUTE_NOT_FOUND');
  });

  app.use(errorHandler);

  return app;
}

