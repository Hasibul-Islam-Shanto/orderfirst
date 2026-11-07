import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import amqplib from 'amqplib';
import { env } from '../config/env.js';
import { logger, errorContext } from '../config/logger.js';
import { AppError } from '../errors/app-error.js';

export interface AppServerEvent {
  type: string;
  payload: Record<string, any>;
  timestamp: string;
}

const eventBus = new EventEmitter();
eventBus.setMaxListeners(200);

let connection: amqplib.ChannelModel | null = null;
let channel: amqplib.Channel | null = null;
let isConnected = false;

const EXCHANGE = 'orderfirst.events';

export async function initGatewayEventConsumer(): Promise<void> {
  try {
    const conn = await amqplib.connect(env.RABBITMQ_URL);
    connection = conn;
    const ch = await conn.createChannel();
    channel = ch;
    isConnected = true;

    conn.on('error', (err: unknown) => {
      logger.warn({ error: errorContext(err) }, 'Gateway AMQP connection error');
      isConnected = false;
      channel = null;
      connection = null;
    });

    conn.on('close', () => {
      logger.warn('Gateway AMQP connection closed');
      isConnected = false;
      channel = null;
      connection = null;
    });

    await ch.assertExchange(EXCHANGE, 'topic', { durable: true });

    // Exclusive, auto-delete queue for this gateway instance
    const q = await ch.assertQueue('', { exclusive: true, autoDelete: true });
    await ch.bindQueue(q.queue, EXCHANGE, 'order.*');
    await ch.bindQueue(q.queue, EXCHANGE, 'booking.*');

    await ch.consume(
      q.queue,
      (msg) => {
        if (!msg) return;
        try {
          const routingKey = msg.fields.routingKey;
          const content = JSON.parse(msg.content.toString());
          const event: AppServerEvent = {
            type: routingKey,
            payload: content,
            timestamp: new Date().toISOString(),
          };
          eventBus.emit('event', event);
          ch.ack(msg);
        } catch (err) {
          logger.warn({ error: errorContext(err) }, 'Failed to parse AMQP message in Gateway');
          ch.nack(msg, false, false);
        }
      },
      { noAck: false },
    );

    logger.info('Gateway SSE RabbitMQ consumer connected and listening');
  } catch (error) {
    logger.warn(
      { error: errorContext(error) },
      'Gateway could not connect to RabbitMQ for SSE. Events will rely on local dispatch.',
    );
    isConnected = false;
  }
}

export function broadcastLocalEvent(type: string, payload: Record<string, any>): void {
  eventBus.emit('event', {
    type,
    payload,
    timestamp: new Date().toISOString(),
  });
}

export function handleEventsStream(request: Request, response: Response): void {
  const user = request.user;
  if (!user) {
    throw new AppError(401, 'Authentication required for live stream', 'UNAUTHENTICATED');
  }

  // Set SSE response headers
  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache, no-transform');
  response.setHeader('Connection', 'keep-alive');
  response.setHeader('X-Accel-Buffering', 'no');
  response.flushHeaders?.();

  // Send initial connection acknowledgement
  response.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', role: user.role })}\n\n`);

  // Heartbeat to keep connection alive through load balancers and proxies
  const heartbeatInterval = setInterval(() => {
    response.write(':keepalive\n\n');
  }, 15000);

  const eventListener = (event: AppServerEvent) => {
    try {
      const isAdmin = user.role?.toUpperCase() === 'ADMIN';
      const eventUserId = event.payload.userId;
      const eventCustomerEmail = event.payload.customerEmail;

      // Admins receive all order and booking events
      // Customers receive events relevant to them
      const isRelevant =
        isAdmin ||
        (eventUserId && eventUserId === user.id) ||
        (eventCustomerEmail && user.email && eventCustomerEmail.toLowerCase() === user.email.toLowerCase());

      if (isRelevant) {
        response.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      }
    } catch {
      // Ignore write errors if client disconnected
    }
  };

  eventBus.on('event', eventListener);

  request.on('close', () => {
    clearInterval(heartbeatInterval);
    eventBus.removeListener('event', eventListener);
  });
}

export async function stopGatewayEventConsumer(): Promise<void> {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch {
    // Ignore close errors
  }
}

