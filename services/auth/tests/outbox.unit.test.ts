import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/config/prisma.js', () => {
  return {
    prisma: {
      outboxEvent: {
        findMany: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
    },
  };
});

vi.mock('../src/amqp/publisher.js', () => {
  return {
    getAmqpChannel: vi.fn(),
    publishUserRegistered: vi.fn(),
    lastTestVerificationCode: undefined,
  };
});

import { prisma } from '../src/config/prisma.js';
import { getAmqpChannel } from '../src/amqp/publisher.js';
import { flushOutboxEvents } from '../src/amqp/outbox-relay.js';

const prismaMock = prisma as unknown as {
  outboxEvent: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

const getAmqpChannelMock = getAmqpChannel as unknown as ReturnType<typeof vi.fn>;

describe('Phase 2: Transactional Outbox Pattern Unit Tests', () => {
  const mockChannel = {
    publish: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('flushes pending outbox events to RabbitMQ and marks them PUBLISHED', async () => {
    const mockPendingEvents = [
      {
        id: '90000000-0000-4000-8000-000000000001',
        exchange: 'orderfirst.events',
        routingKey: 'user.registered',
        correlationId: 'req-uuid-1111',
        payload: {
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          otpCode: '123456',
        },
        attempts: 0,
        status: 'PENDING',
        createdAt: new Date(),
      },
    ];

    prismaMock.outboxEvent.findMany.mockResolvedValueOnce(mockPendingEvents);
    getAmqpChannelMock.mockResolvedValueOnce(mockChannel);
    prismaMock.outboxEvent.update.mockResolvedValueOnce({
      ...mockPendingEvents[0],
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });

    const count = await flushOutboxEvents(10);

    expect(count).toBe(1);
    expect(mockChannel.publish).toHaveBeenCalledTimes(1);

    const call = mockChannel.publish.mock.calls[0] ?? [];
    const [exchange, routingKey, buffer, options] = call;
    expect(exchange).toBe('orderfirst.events');
    expect(routingKey).toBe('user.registered');
    expect(options).toMatchObject({
      persistent: true,
      correlationId: 'req-uuid-1111',
      headers: { 'x-request-id': 'req-uuid-1111' },
    });
    expect(JSON.parse(buffer.toString())).toMatchObject({
      userId: 'user-123',
      otpCode: '123456',
    });

    const pendingItem = mockPendingEvents[0]!;
    expect(prismaMock.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: pendingItem.id },
      data: expect.objectContaining({
        status: 'PUBLISHED',
      }),
    });
  });

  it('records failure and increments attempts on AMQP publish error', async () => {
    const mockPendingEvents = [
      {
        id: '90000000-0000-4000-8000-000000000002',
        exchange: 'orderfirst.events',
        routingKey: 'user.registered',
        correlationId: 'req-uuid-2222',
        payload: { userId: 'user-fail' },
        attempts: 1,
        status: 'PENDING',
      },
    ];

    prismaMock.outboxEvent.findMany.mockResolvedValueOnce(mockPendingEvents);
    const brokenChannel = {
      publish: vi.fn().mockImplementation(() => {
        throw new Error('RabbitMQ channel closed unexpectedly');
      }),
    };
    getAmqpChannelMock.mockResolvedValueOnce(brokenChannel);

    const count = await flushOutboxEvents(10);

    const pendingItem = mockPendingEvents[0]!;
    expect(count).toBe(0);
    expect(prismaMock.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: pendingItem.id },
      data: {
        attempts: { increment: 1 },
        lastError: 'RabbitMQ channel closed unexpectedly',
        status: 'PENDING',
      },
    });
  });
});
