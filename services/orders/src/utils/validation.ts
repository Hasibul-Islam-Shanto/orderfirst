import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const uuidSchema = z.string().uuid('Use a valid resource ID');

export function paginationArgs(query: { page: number; limit: number }) {
  return { skip: (query.page - 1) * query.limit, take: query.limit };
}

