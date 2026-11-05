import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

vi.mock('../src/config/prisma.js', () => {
  return {
    prisma: {},
  };
});

vi.mock('../src/utils/transaction.js', () => {
  return {
    serializableTransaction: vi.fn(async (cb: (tx: any) => Promise<any>) => {
      return cb({
        order: {
          create: vi.fn().mockResolvedValue({
            id: '50000000-0000-4000-8000-000000000001',
            userId: 'user-001',
            customerName: 'Sam Dining',
            customerEmail: 'sam@example.com',
            total: new Prisma.Decimal('28.50'),
            items: [
              {
                menuItemId: 'item-1',
                menuItemName: 'Truffle Pasta',
                quantity: 2,
                unitPrice: new Prisma.Decimal('14.25'),
              },
            ],
          }),
        },
      });
    }),
  };
});

vi.mock('../src/modules/catalog-client/catalog.client.js', () => {
  return {
    fetchCatalogBatchWithRetry: vi.fn().mockResolvedValue([
      {
        id: 'item-1',
        name: 'Truffle Pasta',
        price: '14.25',
        isAvailable: true,
      },
    ]),
  };
});

vi.mock('../src/amqp/publisher.js', () => {
  return {
    publishOrderCreated: vi.fn(),
  };
});

import { createOrder } from '../src/modules/orders/order.service.js';
import { publishOrderCreated } from '../src/amqp/publisher.js';

const publishMock = publishOrderCreated as unknown as ReturnType<typeof vi.fn>;

describe('Phase 3: Orders Event-Driven Message Publishing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publishes order.created event to RabbitMQ when an order is created', async () => {
    const user = {
      id: 'user-001',
      name: 'Sam Dining',
      email: 'sam@example.com',
    };

    const orderInput = {
      orderType: 'PICKUP' as const,
      items: [{ menuItemId: 'item-1', quantity: 2 }],
      notes: 'No garlic',
    };

    const result = await createOrder(user, orderInput);

    expect(result.id).toBe('50000000-0000-4000-8000-000000000001');
    expect(publishMock).toHaveBeenCalledTimes(1);

    const event = publishMock.mock.calls[0]?.[0];
    expect(event).toMatchObject({
      orderId: '50000000-0000-4000-8000-000000000001',
      customerEmail: 'sam@example.com',
      customerName: 'Sam Dining',
      total: '28.50',
    });
    expect(event.items).toHaveLength(1);
    expect(event.items[0]).toMatchObject({
      name: 'Truffle Pasta',
      quantity: 2,
      unitPrice: '14.25',
    });
  });
});

