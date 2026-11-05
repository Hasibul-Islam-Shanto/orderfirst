import { prisma } from '../config/prisma.js';
import { logger, errorContext } from '../config/logger.js';
import { getAmqpChannel } from './publisher.js';

let relayTimer: NodeJS.Timeout | null = null;
let isFlushing = false;

export async function flushOutboxEvents(batchSize = 20): Promise<number> {
  if (isFlushing) return 0;
  isFlushing = true;

  try {
    const pendingEvents = await prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    if (pendingEvents.length === 0) {
      return 0;
    }

    const ch = await getAmqpChannel();
    if (!ch) {
      logger.warn('Outbox relay paused: RabbitMQ channel not available');
      return 0;
    }

    let processedCount = 0;

    for (const event of pendingEvents) {
      try {
        const message = Buffer.from(JSON.stringify(event.payload));
        const correlationId = event.correlationId || undefined;

        ch.publish(event.exchange, event.routingKey, message, {
          persistent: true,
          contentType: 'application/json',
          ...(correlationId ? { correlationId } : {}),
          headers: {
            ...(correlationId ? { 'x-request-id': correlationId } : {}),
          },
        });

        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
          },
        });

        processedCount++;
        logger.info(
          { eventId: event.id, routingKey: event.routingKey },
          'Outbox event successfully published and acknowledged',
        );
      } catch (publishErr) {
        logger.error(
          { eventId: event.id, error: errorContext(publishErr) },
          'Failed to publish outbox event',
        );

        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            attempts: { increment: 1 },
            lastError: (publishErr as Error)?.message || 'Unknown publish error',
            status: event.attempts >= 4 ? 'FAILED' : 'PENDING',
          },
        });
      }
    }

    return processedCount;
  } catch (error) {
    logger.error({ error: errorContext(error) }, 'Outbox relay execution failed');
    return 0;
  } finally {
    isFlushing = false;
  }
}

export function startOutboxRelay(intervalMs = 3000): void {
  if (relayTimer) return;
  relayTimer = setInterval(() => {
    void flushOutboxEvents();
  }, intervalMs);
  relayTimer.unref();
  logger.info({ intervalMs }, 'Outbox relay daemon started');
}

export function stopOutboxRelay(): void {
  if (relayTimer) {
    clearInterval(relayTimer);
    relayTimer = null;
    logger.info('Outbox relay daemon stopped');
  }
}

