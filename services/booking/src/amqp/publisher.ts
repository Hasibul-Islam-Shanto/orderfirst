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

export interface BookingCreatedEvent {
  bookingId: string;
  userId?: string;
  customerEmail: string;
  customerName: string;
  partySize: number;
  reservationTime: string;
}

export interface BookingStatusUpdatedEvent {
  bookingId: string;
  userId?: string;
  status: string;
  customerEmail: string;
  customerName: string;
  partySize: number;
  reservationTime: string;
}

export let lastPublishedBooking: BookingCreatedEvent | undefined;
export let lastPublishedStatusUpdate: BookingStatusUpdatedEvent | undefined;

export function publishBookingCreated(event: BookingCreatedEvent): void {
  lastPublishedBooking = event;
  setImmediate(async () => {
    try {
      const ch = await getAmqpChannel();
      if (!ch) {
        logger.warn(
          { bookingId: event.bookingId },
          'Skipping booking publish: AMQP channel not ready',
        );
        return;
      }
      const message = Buffer.from(JSON.stringify(event));
      ch.publish(EXCHANGE, 'booking.created', message, {
        persistent: true,
        contentType: 'application/json',
      });
      logger.info(
        { bookingId: event.bookingId },
        'Published booking.created event',
      );
    } catch (error) {
      logger.error(
        { bookingId: event.bookingId, error: errorContext(error) },
        'Failed to publish booking.created event',
      );
    }
  });
}

export function publishBookingStatusUpdated(event: BookingStatusUpdatedEvent): void {
  lastPublishedStatusUpdate = event;
  setImmediate(async () => {
    try {
      const ch = await getAmqpChannel();
      if (!ch) {
        logger.warn(
          { bookingId: event.bookingId },
          'Skipping booking status publish: AMQP channel not ready',
        );
        return;
      }
      const message = Buffer.from(JSON.stringify(event));
      ch.publish(EXCHANGE, 'booking.status_updated', message, {
        persistent: true,
        contentType: 'application/json',
      });
      logger.info(
        { bookingId: event.bookingId, status: event.status },
        'Published booking.status_updated event',
      );
    } catch (error) {
      logger.error(
        { bookingId: event.bookingId, error: errorContext(error) },
        'Failed to publish booking.status_updated event',
      );
    }
  });
}

export async function closeAmqp(): Promise<void> {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch {
    // Ignore error on close
  }
}
