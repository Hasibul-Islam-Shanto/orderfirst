import amqplib from 'amqplib';
import { env } from '../config/env.js';
import { logger, errorContext } from '../config/logger.js';

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

export interface UserRegisteredEvent {
  userId: string;
  name: string;
  email: string;
  otpCode: string;
  expiresAt: string;
}

export function publishUserRegistered(event: UserRegisteredEvent): void {
  // Non-blocking fire-and-forget
  setImmediate(async () => {
    try {
      const ch = await getAmqpChannel();
      if (!ch) {
        logger.warn(
          { userId: event.userId },
          'Skipping event publish: AMQP channel not ready',
        );
        return;
      }
      const message = Buffer.from(JSON.stringify(event));
      ch.publish(EXCHANGE, 'user.registered', message, {
        persistent: true,
        contentType: 'application/json',
      });
      logger.info({ userId: event.userId }, 'Published user.registered event');
    } catch (error) {
      logger.error(
        { userId: event.userId, error: errorContext(error) },
        'Failed to publish user.registered event',
      );
    }
  });
}

export async function closeAmqp(): Promise<void> {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch {
    // Ignore error during shutdown
  }
}
