import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';
import { closeAmqp } from './amqp/publisher.js';
import { startOutboxRelay, stopOutboxRelay } from './amqp/outbox-relay.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, service: 'auth' }, 'Auth service started');
  startOutboxRelay();
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'Graceful shutdown initiated');
  stopOutboxRelay();
  server.close(async () => {
    await closeAmqp();
    await prisma.$disconnect();
    logger.info('Auth service shut down cleanly');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { app, server };

