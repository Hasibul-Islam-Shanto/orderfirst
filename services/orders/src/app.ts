import { randomUUID } from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { logger, errorContext } from './config/logger.js';
import { requestContext } from './config/context.js';
import { metrics } from './config/metrics.js';
import { AppError } from './errors/app-error.js';
import { errorHandler } from './middlewares/error-handler.js';
import { orderRouter, adminOrderRouter } from './modules/orders/order.route.js';

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
        'X-User-Name',
        'X-User-Email',
      ],
    }),
  );

  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok', service: 'orders' });
  });

  app.get(['/metrics', '/metrices'], async (_request, response) => {
    response.setHeader('Content-Type', metrics.register.contentType);
    response.send(await metrics.register.metrics());
  });

  app.get('/health/ready', async (_request, response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      logger.error(
        { error: errorContext(error) },
        'Readiness database check failed',
      );
      return response
        .status(503)
        .json({ status: 'unavailable', service: 'orders' });
    }

    // Catalog reachability logged as warning, not fatal for read operations
    try {
      const res = await fetch(`${env.CATALOG_SERVICE_URL}/health`, {
        signal: AbortSignal.timeout(1000),
      });
      if (!res.ok) {
        logger.warn('Catalog service responded with non-ok status');
      }
    } catch (error) {
      logger.warn(
        { error: errorContext(error) },
        'Catalog service reachability check warning during readiness probe',
      );
    }

    return response.json({ status: 'ready', service: 'orders' });
  });

  // Orders routes
  app.use('/orders', orderRouter);
  app.use('/api/orders', orderRouter);
  app.use('/admin/orders', adminOrderRouter);
  app.use('/api/admin/orders', adminOrderRouter);

  app.use(() => {
    throw new AppError(404, 'Route not found', 'ROUTE_NOT_FOUND');
  });

  app.use(errorHandler);

  return app;
}

