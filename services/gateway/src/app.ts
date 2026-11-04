import { randomUUID } from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { AppError } from './errors/app-error.js';
import {
  protectCookieRequests,
  createIpRateLimit,
  extractSession,
  requireAdmin,
} from './middlewares/security.js';
import {
  authProxy,
  catalogProxy,
  ordersProxy,
  bookingProxy,
} from './proxy/index.js';
import {
  getAggregatedDashboard,
  getAggregatedHealthReady,
} from './aggregation/dashboard.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY_HOPS);

  // Request ID and duration logging
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
        'Gateway request completed',
      ),
    );
    next();
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
        'Authorization',
        'Cookie',
      ],
    }),
  );

  app.use(createIpRateLimit());
  app.use(protectCookieRequests);
  app.use(cookieParser());
  app.use(extractSession);

  // Gateway health endpoints
  app.get('/health', (_request, response) => {
    response.json({ status: 'ok', service: 'gateway' });
  });

  app.get('/health/ready', getAggregatedHealthReady);

  // Edge aggregation: Dashboard endpoint
  app.get('/api/admin/dashboard', requireAdmin, getAggregatedDashboard);

  // Body parser for JSON payloads up to 32kb
  app.use(express.json({ limit: '32kb' }));

  // Reverse proxy routes
  app.use(['/api/auth', '/api/users'], authProxy);
  app.use(['/api/menu', '/api/admin/menu'], catalogProxy);
  app.use(['/api/orders', '/api/admin/orders'], ordersProxy);
  app.use(
    [
      '/api/reservations',
      '/api/tables',
      '/api/admin/reservations',
      '/api/admin/tables',
    ],
    bookingProxy,
  );

  app.use(() => {
    throw new AppError(404, 'Route not found', 'ROUTE_NOT_FOUND');
  });

  // Centralized Error handler
  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof AppError) {
        return response.status(error.statusCode).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      }
      return response.status(500).json({
        success: false,
        message: 'Internal Gateway Error',
        code: 'GATEWAY_ERROR',
      });
    },
  );

  return app;
}

