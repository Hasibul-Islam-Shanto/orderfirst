import amqplib from 'amqplib';
import { env } from '../config/env.js';
import { logger, errorContext } from '../config/logger.js';
import {
  sendNotificationEmail,
  sendOrderNotificationEmail,
  sendOrderStatusNotificationEmail,
  sendBookingNotificationEmail,
} from '../config/mail.js';
import { defaultIdempotencyStore } from '../utils/idempotency.js';

const EXCHANGE = 'orderfirst.events';
const QUEUE_USER = 'notify.user-registered';
const ROUTING_USER = 'user.registered';

const QUEUE_ORDER = 'notify.order-events';
const ROUTING_ORDER = 'order.*';

const QUEUE_BOOKING = 'notify.booking-events';
const ROUTING_BOOKING = 'booking.*';

const DLX_EXCHANGE = 'orderfirst.events.dlx';
const DLQ_QUEUE = 'notify.events.dlq';
const MAX_ATTEMPTS = 3;

let connection: amqplib.ChannelModel | null = null;
let channel: amqplib.Channel | null = null;
let isConnected = false;

export function getIsAmqpConnected(): boolean {
  return isConnected;
}

async function handleDelivery<T>(
  msg: amqplib.ConsumeMessage | null,
  keyPrefix: string,
  processor: (payload: T, msgLogger: typeof logger) => Promise<void>,
) {
  if (!msg) return;

  const deathHeader = msg.properties.headers?.['x-death'];
  let deathCount = 0;
  if (Array.isArray(deathHeader) && deathHeader.length > 0) {
    deathCount = deathHeader[0]?.count || 0;
  }

  const correlationId =
    msg.properties.correlationId ||
    (msg.properties.headers?.['x-request-id'] as string) ||
    undefined;
  const msgLogger = correlationId
    ? logger.child({ requestId: correlationId })
    : logger;

  try {
    const content = JSON.parse(msg.content.toString()) as T & {
      id?: string;
      userId?: string;
      orderId?: string;
      bookingId?: string;
      otpCode?: string;
    };

    const entityId =
      content.id ||
      content.orderId ||
      content.bookingId ||
      (content.userId && content.otpCode ? `${content.userId}:${content.otpCode}` : content.userId) ||
      'unknown';

    const idempotencyKey = msg.properties.messageId || `${keyPrefix}:${entityId}`;

    if (defaultIdempotencyStore.has(idempotencyKey)) {
      msgLogger.info(
        { idempotencyKey },
        'Duplicate notification message detected. Acknowledging without re-dispatch.',
      );
      channel?.ack(msg);
      return;
    }

    msgLogger.info({ idempotencyKey }, 'Processing notification message');
    await processor(content, msgLogger);

    defaultIdempotencyStore.set(idempotencyKey);
    channel?.ack(msg);
    msgLogger.info({ idempotencyKey }, 'Notification processed successfully');
  } catch (error) {
    msgLogger.error(
      { error: errorContext(error), deathCount },
      'Failed to process notification message',
    );

    if (deathCount >= MAX_ATTEMPTS - 1) {
      logger.warn('Max processing attempts reached. Routing message to DLQ');
      channel?.nack(msg, false, false);
    } else {
      channel?.nack(msg, false, false);
    }
  }
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

    await channel.assertExchange(DLX_EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(DLQ_QUEUE, { durable: true });
    await channel.bindQueue(DLQ_QUEUE, DLX_EXCHANGE, '#');

    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(QUEUE_USER, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': DLX_EXCHANGE,
        'x-dead-letter-routing-key': ROUTING_USER,
      },
    });
    await channel.bindQueue(QUEUE_USER, EXCHANGE, ROUTING_USER);

    await channel.assertQueue(QUEUE_ORDER, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': DLX_EXCHANGE,
        'x-dead-letter-routing-key': 'order.dlq',
      },
    });
    await channel.bindQueue(QUEUE_ORDER, EXCHANGE, ROUTING_ORDER);

    await channel.assertQueue(QUEUE_BOOKING, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': DLX_EXCHANGE,
        'x-dead-letter-routing-key': 'booking.dlq',
      },
    });
    await channel.bindQueue(QUEUE_BOOKING, EXCHANGE, ROUTING_BOOKING);

    await channel.prefetch(10);

    await channel.consume(
      QUEUE_USER,
      (msg) =>
        handleDelivery<{
          userId: string;
          name: string;
          email: string;
          otpCode: string;
        }>(msg, 'user.registered', async (data) => {
          await sendNotificationEmail({
            to: data.email,
            name: data.name,
            code: data.otpCode,
          });
        }),
      { noAck: false },
    );

    await channel.consume(
      QUEUE_ORDER,
      (msg) => {
        const routingKey = msg?.fields.routingKey;
        if (routingKey === 'order.status_updated') {
          return handleDelivery<{
            orderId: string;
            customerEmail: string;
            customerName: string;
            status: string;
          }>(msg, 'order.status_updated', async (data) => {
            await sendOrderStatusNotificationEmail({
              to: data.customerEmail,
              orderId: data.orderId,
              customerName: data.customerName,
              status: data.status,
            });
          });
        }
        return handleDelivery<{
          orderId: string;
          customerEmail: string;
          customerName: string;
          total: string | number;
          items: Array<{ name: string; quantity: number; unitPrice: string | number }>;
        }>(msg, 'order.created', async (data) => {
          await sendOrderNotificationEmail({
            to: data.customerEmail,
            order: {
              orderId: data.orderId,
              customerName: data.customerName,
              total: data.total,
              items: data.items,
            },
          });
        });
      },
      { noAck: false },
    );

    await channel.consume(
      QUEUE_BOOKING,
      (msg) =>
        handleDelivery<{
          bookingId: string;
          customerEmail: string;
          customerName: string;
          partySize: number;
          reservationTime: string;
        }>(msg, 'booking.created', async (data) => {
          await sendBookingNotificationEmail({
            to: data.customerEmail,
            booking: {
              bookingId: data.bookingId,
              customerName: data.customerName,
              partySize: data.partySize,
              reservationTime: data.reservationTime,
            },
          });
        }),
      { noAck: false },
    );

    logger.info('Notification consumers started for user, order, and booking events');
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

