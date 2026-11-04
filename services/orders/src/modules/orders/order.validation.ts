import { z } from 'zod';
import { OrderStatus, OrderType } from '@prisma/client';
import { paginationSchema, uuidSchema } from '../../utils/validation.js';

export const orderRequest = z.object({
  params: z.object({ orderId: uuidSchema }),
});

export const orderListRequest = z.object({
  query: paginationSchema
    .extend({
      status: z.enum(OrderStatus).optional(),
      search: z.string().trim().min(1).max(100).optional(),
    })
    .strict(),
});

export const createOrderRequest = z.object({
  body: z.strictObject({
    orderType: z.enum(OrderType),
    notes: z.string().trim().max(500).optional(),
    items: z
      .array(
        z.strictObject({
          menuItemId: uuidSchema,
          quantity: z
            .number()
            .int()
            .min(1, 'Quantity must be at least 1')
            .max(20),
        }),
      )
      .min(1, 'Add at least one menu item')
      .max(50)
      .refine(
        (items) =>
          new Set(items.map((item) => item.menuItemId)).size === items.length,
        'Combine repeated menu items into one quantity',
      ),
  }),
});

export const orderStatusRequest = orderRequest.extend({
  body: z.strictObject({ status: z.enum(OrderStatus) }),
});

