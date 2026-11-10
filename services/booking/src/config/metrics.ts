import promClient from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

export function createMetrics(serviceName: string) {
  const register = new promClient.Registry();
  register.setDefaultLabels({ service: serviceName });

  promClient.collectDefaultMetrics({ register, prefix: 'orderfirst_' });

  const httpRequestsTotal = new promClient.Counter({
    name: 'orderfirst_http_requests_total',
    help: 'Total number of HTTP requests processed',
    labelNames: ['service', 'method', 'route', 'status_code'],
    registers: [register],
  });

  const httpRequestDurationSeconds = new promClient.Histogram({
    name: 'orderfirst_http_request_duration_seconds',
    help: 'Histogram of HTTP request durations in seconds',
    labelNames: ['service', 'method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register],
  });

  function normalizeRoute(req: Request): string {
    if (req.route?.path) {
      return `${req.baseUrl || ''}${req.route.path}`;
    }
    const cleanPath = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path;
    return cleanPath
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replace(/\/\d+/g, '/:id');
  }

  function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
    if (req.path === '/metrics' || req.path === '/metrices') {
      return next();
    }
    const started = performance.now();
    res.on('finish', () => {
      const durationSeconds = (performance.now() - started) / 1000;
      const route = normalizeRoute(req);
      const labels = {
        service: serviceName,
        method: req.method,
        route,
        status_code: String(res.statusCode),
      };
      httpRequestsTotal.inc(labels);
      httpRequestDurationSeconds.observe(labels, durationSeconds);
    });
    next();
  }

  return { register, metricsMiddleware, httpRequestsTotal, httpRequestDurationSeconds };
}

export const metrics = createMetrics('booking');
