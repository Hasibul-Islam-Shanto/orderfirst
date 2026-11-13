import express from 'express';
import helmet from 'helmet';
import { getIsAmqpConnected } from './amqp/consumer.js';
import { metrics } from './config/metrics.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(metrics.metricsMiddleware);
  app.use(helmet());

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok', service: 'notify' });
  });

  app.get(['/metrics', '/metrices'], async (_request, response) => {
    response.setHeader('Content-Type', metrics.register.contentType);
    response.send(await metrics.register.metrics());
  });

  app.get('/health/ready', (_request, response) => {
    const ready = getIsAmqpConnected();
    if (ready) {
      return response.json({ status: 'ready', service: 'notify' });
    }
    return response
      .status(503)
      .json({ status: 'unavailable', service: 'notify' });
  });

  return app;
}

