import express from 'express';
import helmet from 'helmet';
import { getIsAmqpConnected } from './amqp/consumer.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok', service: 'notify' });
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

