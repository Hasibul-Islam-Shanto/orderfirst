import { z } from 'zod';
import {
  paginationSchema,
  uuidSchema,
  availabilityBody,
} from '../../utils/validation.js';

const tableBody = z.strictObject({
  tableNumber: z.number().int().min(1).max(999),
  capacity: z.number().int().min(1).max(8),
  isAvailable: z.boolean().default(true),
});

export const tableListRequest = z.object({ query: paginationSchema.strict() });
export const tableRequest = z.object({
  params: z.object({ restaurantTableId: uuidSchema }),
});

export const createTableRequest = z.object({ body: tableBody });

export const updateTableRequest = tableRequest.extend({
  body: tableBody
    .omit({ isAvailable: true })
    .partial()
    .extend({ isAvailable: z.boolean().optional() })
    .refine(
      (body) => Object.keys(body).length > 0,
      'Provide at least one field to update',
    ),
});

export const tableAvailabilityRequest = tableRequest.extend({
  body: availabilityBody,
});

