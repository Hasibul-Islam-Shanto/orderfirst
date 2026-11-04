import { z } from 'zod';
import {
  paginationSchema,
  uuidSchema,
  queryBooleanSchema,
  availabilityBody,
} from '../../utils/validation.js';

const categoryBody = z.strictObject({
  name: z.string().trim().min(2).max(60),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Use lowercase words separated by hyphens',
    ),
});

const menuBody = z.strictObject({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(1000),
  price: z
    .number()
    .positive('Price must be greater than 0')
    .max(9999.99)
    .multipleOf(0.01, 'Price must have at most two decimal places'),
  imageUrl: z
    .string()
    .url()
    .max(2048)
    .refine(
      (value) => value.startsWith('https://'),
      'Image URL must use HTTPS',
    ),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  preparationTimeMinutes: z.number().int().min(1).max(120),
  categoryId: uuidSchema,
});

export const menuListRequest = z.object({
  query: paginationSchema
    .extend({
      search: z.string().trim().max(100).optional(),
      category: z.string().min(1).max(80).optional(),
      available: queryBooleanSchema.optional(),
      featured: queryBooleanSchema.optional(),
    })
    .strict(),
});

export const categoryListRequest = z.object({
  query: paginationSchema.strict(),
});

export const menuItemRequest = z.object({
  params: z.object({ menuItemId: uuidSchema }),
});

export const deleteMenuItemRequest = menuItemRequest.extend({
  query: z
    .object({
      hard: z.enum(['true', 'false']).optional(),
    })
    .optional(),
});

export const categoryRequest = z.object({
  params: z.object({ categoryId: uuidSchema }),
});

export const createCategoryRequest = z.object({ body: categoryBody });

export const updateCategoryRequest = categoryRequest.extend({
  body: categoryBody
    .partial()
    .refine(
      (body) => Object.keys(body).length > 0,
      'Provide at least one field to update',
    ),
});

export const createMenuItemRequest = z.object({ body: menuBody });

export const updateMenuItemRequest = menuItemRequest.extend({
  body: menuBody
    .omit({ isAvailable: true, isFeatured: true })
    .partial()
    .extend({
      isAvailable: z.boolean().optional(),
      isFeatured: z.boolean().optional(),
    })
    .refine(
      (body) => Object.keys(body).length > 0,
      'Provide at least one field to update',
    ),
});

export const menuAvailabilityRequest = menuItemRequest.extend({
  body: availabilityBody,
});

export const batchLookupRequest = z.object({
  body: z.strictObject({
    ids: z.array(uuidSchema).min(1).max(100),
  }),
});

