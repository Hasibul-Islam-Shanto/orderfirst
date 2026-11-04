import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, service: 'catalog' }, 'Catalog service started');
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'Graceful shutdown initiated');
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Catalog service shut down cleanly');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { app, server };

