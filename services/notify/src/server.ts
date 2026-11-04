import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { startNotificationConsumer, stopNotificationConsumer } from './amqp/consumer.js';

const app = createApp();

const server = app.listen(env.PORT, async () => {
  logger.info({ port: env.PORT, service: 'notify' }, 'Notify service HTTP started');
  await startNotificationConsumer();
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'Graceful shutdown initiated');
  server.close(async () => {
    await stopNotificationConsumer();
    logger.info('Notify service shut down cleanly');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { app, server };

