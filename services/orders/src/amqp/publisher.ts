import amqplib from 'amqplib';
import { env } from '../config/env.js';
import { logger, errorContext } from '../config/logger.js';
import { getRequestId } from '../config/context.js';

let connection: amqplib.ChannelModel | null = null;
let channel: amqplib.Channel | null = null;

const EXCHANGE = 'orderfirst.events';

export async function getAmqpChannel(): Promise<amqplib.Channel | null> {
  if (channel) return channel;
  try {
    const conn = await amqplib.connect(env.RABBITMQ_URL);
    connection = conn;
    const ch = await conn.createChannel();
    channel = ch;
    await ch.assertExchange(EXCHANGE, 'topic', { durable: true });

    conn.on('error', (err: unknown) => {
      logger.error({ error: errorContext(err) }, 'AMQP connection error');
      channel = null;
      connection = null;
    });

    conn.on('close', () => {
      logger.warn('AMQP connection closed');
      channel = null;
      connection = null;
    });

    return ch;
  } catch (error) {
    logger.warn({ error: errorContext(error) }, 'Could not connect to RabbitMQ');
    return null;
  }
}

export interface OrderCreatedEvent {
  orderId: string;
  customerEmail: string;
  customerName: string;
  total: string | number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: string | number;
  }>;
}

export let lastPublishedOrder: OrderCreatedEvent | undefined;

export function publishOrderCreated(event: OrderCreatedEvent): void {
  lastPublishedOrder = event;
  setImmediate(async () => {
    try {
      const ch = await getAmqpChannel();
      if (!ch) {
        logger.warn({ orderId: event.orderId }, 'Skipping order publish: AMQP channel not ready');
        return;
      }
      const message = Buffer.from(JSON.stringify(event));
      const requestId = getRequestId();
      ch.publish(EXCHANGE, 'order.created', message, {
        persistent: true,
        contentType: 'application/json',
        ...(requestId ? { correlationId: requestId } : {}),
        headers: {
          ...(requestId ? { 'x-request-id': requestId } : {}),
        },
      });
      logger.info({ orderId: event.orderId }, 'Published order.created event');
    } catch (error) {
      logger.error(
        { orderId: event.orderId, error: errorContext(error) },
        'Failed to publish order.created event',
      );
    }
  });
}

export async function closeAmqp(): Promise<void> {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch {
  }
}

