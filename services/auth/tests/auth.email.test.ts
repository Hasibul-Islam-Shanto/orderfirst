import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/config/prisma.js', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      emailVerificationCode: {
        deleteMany: vi.fn(),
        create: vi.fn(),
        findFirst: vi.fn(),
      },
      outboxEvent: {
        create: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(async (arg: unknown) => {
        if (Array.isArray(arg)) {
          return Promise.all(arg);
        }
        if (typeof arg === 'function') {
          return arg(prismaMock);
        }
        return arg;
      }),
    },
  };
});

vi.mock('../src/amqp/publisher.js', () => {
  return {
    publishUserRegistered: vi.fn(),
    lastTestVerificationCode: undefined,
  };
});

vi.mock('../src/amqp/outbox-relay.js', () => {
  return {
    flushOutboxEvents: vi.fn().mockResolvedValue(1),
    startOutboxRelay: vi.fn(),
    stopOutboxRelay: vi.fn(),
  };
});

import { prisma } from '../src/config/prisma.js';
import { publishUserRegistered } from '../src/amqp/publisher.js';
import { registerUser, resendVerificationEmail } from '../src/modules/auth/auth.service.js';

const prismaMock = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  emailVerificationCode: {
    deleteMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const publishMock = publishUserRegistered as unknown as ReturnType<typeof vi.fn>;

describe('Phase 1: Auth Asynchronous Event Dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publishes user.registered AMQP event on user registration without blocking on SMTP', async () => {
    const mockUser = {
      id: '10000000-0000-4000-8000-000000000001',
      name: 'Alice Cooper',
      email: 'alice@example.com',
      role: 'CUSTOMER',
      emailVerifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.create.mockResolvedValueOnce(mockUser);
    prismaMock.emailVerificationCode.deleteMany.mockResolvedValueOnce({ count: 0 });
    prismaMock.emailVerificationCode.create.mockResolvedValueOnce({
      id: '20000000-0000-4000-8000-000000000002',
      userId: mockUser.id,
      codeHash: 'hashed_otp',
      expiresAt: new Date(Date.now() + 600000),
      createdAt: new Date(),
    });

    const result = await registerUser({
      name: 'Alice Cooper',
      email: 'alice@example.com',
      password: 'password123',
    });

    expect(result.id).toBe(mockUser.id);
    expect(result.email).toBe('alice@example.com');

    // Verification event must be dispatched to RabbitMQ
    expect(publishMock).toHaveBeenCalledTimes(1);
    const eventPayload = publishMock.mock.calls[0]?.[0];
    expect(eventPayload).toMatchObject({
      userId: mockUser.id,
      name: 'Alice Cooper',
      email: 'alice@example.com',
    });
    expect(eventPayload.otpCode).toMatch(/^\d{6}$/);
    expect(typeof eventPayload.expiresAt).toBe('string');
  });

  it('publishes fresh user.registered AMQP event on resendVerificationEmail', async () => {
    const mockUser = {
      id: '10000000-0000-4000-8000-000000000001',
      name: 'Alice Cooper',
      email: 'alice@example.com',
      emailVerifiedAt: null,
    };

    prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);
    prismaMock.emailVerificationCode.findFirst.mockResolvedValueOnce({
      createdAt: new Date(Date.now() - 120000),
    });
    prismaMock.emailVerificationCode.deleteMany.mockResolvedValueOnce({ count: 1 });
    prismaMock.emailVerificationCode.create.mockResolvedValueOnce({
      id: '30000000-0000-4000-8000-000000000003',
      userId: mockUser.id,
      codeHash: 'new_hashed_otp',
      expiresAt: new Date(Date.now() + 600000),
      createdAt: new Date(),
    });

    await resendVerificationEmail(mockUser.id);

    expect(publishMock).toHaveBeenCalledTimes(1);
    const eventPayload = publishMock.mock.calls[0]?.[0];
    expect(eventPayload).toMatchObject({
      userId: mockUser.id,
      name: 'Alice Cooper',
      email: 'alice@example.com',
    });
    expect(eventPayload.otpCode).toMatch(/^\d{6}$/);
  });
});
