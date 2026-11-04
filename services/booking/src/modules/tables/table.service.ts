import type { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../errors/app-error.js';
import { paginationArgs } from '../../utils/validation.js';
import { serializableTransaction } from '../../utils/transaction.js';
import {
  blockingReservationStatuses,
  reservationDurationMinutes,
} from '../reservations/reservation.constants.js';
import type * as validation from './table.validation.js';

export async function getTables(query: { page: number; limit: number }) {
  const [data, total] = await prisma.$transaction([
    prisma.restaurantTable.findMany({
      ...paginationArgs(query),
      orderBy: { tableNumber: 'asc' },
    }),
    prisma.restaurantTable.count(),
  ]);
  return { data, total };
}

export function createTable(
  input: z.output<typeof validation.createTableRequest>['body'],
) {
  return prisma.restaurantTable.create({ data: input });
}

export async function updateTable(
  restaurantTableId: string,
  input: z.output<typeof validation.updateTableRequest>['body'],
) {
  return serializableTransaction(async (transaction) => {
    if (input.capacity !== undefined) {
      const tooLarge = await transaction.reservation.findFirst({
        where: {
          restaurantTableId,
          status: { in: blockingReservationStatuses },
          reservationDate: {
            gt: new Date(Date.now() - reservationDurationMinutes * 60000),
          },
          guestCount: { gt: input.capacity },
        },
        select: { id: true },
      });
      if (tooLarge)
        throw new AppError(
          409,
          'Capacity cannot be reduced below an active or upcoming reservation’s guest count',
          'TABLE_CAPACITY_CONFLICT',
        );
    }
    return transaction.restaurantTable.update({
      where: { id: restaurantTableId },
      data: {
        ...(input.tableNumber !== undefined
          ? { tableNumber: input.tableNumber }
          : {}),
        ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
        ...(input.isAvailable !== undefined
          ? { isAvailable: input.isAvailable }
          : {}),
      },
    });
  });
}

export async function deleteTable(restaurantTableId: string) {
  await prisma.restaurantTable.delete({ where: { id: restaurantTableId } });
  return null;
}

export function updateTableAvailability(
  restaurantTableId: string,
  isAvailable: boolean,
) {
  return updateTable(restaurantTableId, { isAvailable });
}

