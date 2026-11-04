import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { createOrderRequest } from '../src/modules/orders/order.validation.js';
import { calculateOrderTotal } from '../src/modules/orders/order.service.js';
import { orderTransitions } from '../src/modules/orders/order.constants.js';

const resourceId = '10000000-0000-4000-8000-000000000001';

describe('Orders service validation and monetary calculation', () => {
  it('rejects client totals and repeated menu item IDs', () => {
    const body = {
      orderType: 'PICKUP',
      items: [{ menuItemId: resourceId, quantity: 1 }],
    };

    expect(
      createOrderRequest.safeParse({ body: { ...body, total: 0 } }).success,
    ).toBe(false);

    expect(
      createOrderRequest.safeParse({
        body: { ...body, items: [...body.items, ...body.items] },
      }).success,
    ).toBe(false);

    expect(
      createOrderRequest.safeParse({
        body: { ...body, items: [{ menuItemId: resourceId, quantity: 0 }] },
      }).success,
    ).toBe(false);
  });

  it('calculates totals using exact decimal arithmetic', () => {
    expect(
      calculateOrderTotal([
        { unitPrice: new Prisma.Decimal('0.10'), quantity: 3 },
        { unitPrice: new Prisma.Decimal('19.99'), quantity: 2 },
      ]).toFixed(2),
    ).toBe('40.28');
  });

  it('enforces valid status transitions for orders', () => {
    expect(orderTransitions.PENDING).toContain('CONFIRMED');
    expect(orderTransitions.PENDING).toContain('CANCELLED');
    expect(orderTransitions.CONFIRMED).toContain('PREPARING');
    expect(orderTransitions.CONFIRMED).toContain('CANCELLED');
    expect(orderTransitions.PREPARING).toContain('READY');
    expect(orderTransitions.PREPARING).toContain('CANCELLED');
    expect(orderTransitions.READY).toContain('COMPLETED');
    expect(orderTransitions.READY).toContain('CANCELLED');
    expect(orderTransitions.COMPLETED).toHaveLength(0);
    expect(orderTransitions.CANCELLED).toHaveLength(0);
  });
});

