import amqplib from 'amqplib';
import { env } from '../config/env.js';
import { logger, errorContext } from '../config/logger.js';
import { sendNotificationEmail } from '../config/mail.js';

const EXCHANGE = 'orderfirst.events';
const QUEUE = 'notify.user-registered';
const ROUTING_KEY = 'user.registered';

const DLX_EXCHANGE = 'orderfirst.events.dlx';
const DLQ_QUEUE = 'notify.user-registered.dlq';
const MAX_ATTEMPTS = 3;

let connection: amqplib.ChannelModel | null = null;
let channel: amqplib.Channel | null = null;
let isConnected = false;

export function getIsAmqpConnected(): boolean {
  return isConnected;
}

export async function startNotificationConsumer(): Promise<void> {
  try {
    connection = await amqplib.connect(env.RABBITMQ_URL);
    channel = await connection.createChannel();
    isConnected = true;

    connection.on('error', (err: unknown) => {
      logger.error({ error: errorContext(err) }, 'RabbitMQ connection error');
      isConnected = false;
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
      isConnected = false;
    });

    // 1. Declare dead-letter exchange and queue
    await channel.assertExchange(DLX_EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(DLQ_QUEUE, { durable: true });
    await channel.bindQueue(DLQ_QUEUE, DLX_EXCHANGE, '#');

    // 2. Declare primary exchange and queue with dead-letter configuration
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': DLX_EXCHANGE,
        'x-dead-letter-routing-key': ROUTING_KEY,
      },
    });
    await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

    // 3. Set prefetch
    await channel.prefetch(10);

    logger.info({ queue: QUEUE }, 'Starting consumer for notify.user-registered');

    await channel.consume(
      QUEUE,
      async (msg) => {
        if (!msg) return;

        // Check delivery / death count
        const deathHeader = msg.properties.headers?.['x-death'];
        let deathCount = 0;
        if (Array.isArray(deathHeader) && deathHeader.length > 0) {
          deathCount = deathHeader[0]?.count || 0;
        }

        try {
          const content = JSON.parse(msg.content.toString()) as {
            userId: string;
            name: string;
            email: string;
            otpCode: string;
            expiresAt: string;
          };

          logger.info(
            { userId: content.userId },
            'Processing user.registered notification',
          );

          await sendNotificationEmail({
            to: content.email,
            name: content.name,
            code: content.otpCode,
          });

          channel?.ack(msg);
          logger.info({ userId: content.userId }, 'Notification processed successfully');
        } catch (error) {
          logger.error(
            { error: errorContext(error), deathCount },
            'Failed to process notification message',
          );

          if (deathCount >= MAX_ATTEMPTS - 1) {
            logger.warn('Max processing attempts reached. Routing message to DLQ');
            // Reject without requeue -> goes to dead-letter exchange
            channel?.nack(msg, false, false);
          } else {
            // Requeue or nack to dead-letter
            channel?.nack(msg, false, false);
          }
        }
      },
      { noAck: false },
    );
  } catch (error) {
    logger.warn({ error: errorContext(error) }, 'Could not initialize RabbitMQ consumer');
    isConnected = false;
  }
}

export async function stopNotificationConsumer(): Promise<void> {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch {
    // Ignore error on close
  }
}

