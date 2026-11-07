import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import {
  initGatewayEventConsumer,
  stopGatewayEventConsumer,
} from './events/sse.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, service: 'gateway' }, 'Gateway service started');
  initGatewayEventConsumer().catch(() => {});
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'Gateway shutdown initiated');
  await stopGatewayEventConsumer().catch(() => {});
  server.close(() => {
    logger.info('Gateway shut down cleanly');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { app, server };

