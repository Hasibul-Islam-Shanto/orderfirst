import { Prisma, type ReservationStatus } from '@prisma/client';
import type { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../errors/app-error.js';
import { logger } from '../../config/logger.js';
import { serializableTransaction } from '../../utils/transaction.js';
import { paginationArgs } from '../../utils/validation.js';
import {
  blockingReservationStatuses,
  reservationDurationMinutes,
  reservationTransitions,
} from './reservation.constants.js';
import type {
  createReservationRequest,
  reservationListRequest,
} from './reservation.validation.js';

export function reservationConflictWhere(
  reservationDate: Date,
): Prisma.ReservationWhereInput {
  return {
    status: { in: blockingReservationStatuses },
    reservationDate: {
      gt: new Date(
        reservationDate.getTime() - reservationDurationMinutes * 60000,
      ),
      lt: new Date(
        reservationDate.getTime() + reservationDurationMinutes * 60000,
      ),
    },
  };
}

export function findAvailableTables(reservationDate: Date, guestCount: number) {
  return prisma.restaurantTable.findMany({
    where: {
      isAvailable: true,
      capacity: { gte: guestCount },
      reservations: { none: reservationConflictWhere(reservationDate) },
    },
    orderBy: [{ capacity: 'asc' }, { tableNumber: 'asc' }],
    take: 100,
  });
}

export async function createReservation(
  user: { id: string; name?: string; email?: string },
  input: z.output<typeof createReservationRequest>['body'],
) {
  try {
    return await serializableTransaction(async (transaction) => {
      if (input.reservationDate.getTime() <= Date.now())
        throw new AppError(
          400,
          'Reservation must be scheduled for a future time',
          'INVALID_RESERVATION_DATE',
        );
      const restaurantTable = await transaction.restaurantTable.findUnique({
        where: { id: input.restaurantTableId },
      });
      if (!restaurantTable)
        throw new AppError(
          404,
          'Restaurant table not found',
          'TABLE_NOT_FOUND',
        );
      if (!restaurantTable.isAvailable)
        throw new AppError(
          409,
          'Selected table is not available',
          'TABLE_UNAVAILABLE',
        );
      if (input.guestCount > restaurantTable.capacity)
        throw new AppError(
          400,
          'Guest count cannot exceed table capacity',
          'TABLE_CAPACITY_EXCEEDED',
        );
      const conflict = await transaction.reservation.findFirst({
        where: {
          restaurantTableId: restaurantTable.id,
          ...reservationConflictWhere(input.reservationDate),
        },
        select: { id: true },
      });
      if (conflict)
        throw new AppError(
          409,
          'Selected table is not available for this time',
          'RESERVATION_CONFLICT',
        );
      return transaction.reservation.create({
        data: {
          userId: user.id,
          customerName: user.name || 'Valued Guest',
          customerEmail: user.email || 'guest@orderfirst.test',
          restaurantTableId: restaurantTable.id,
          reservationDate: input.reservationDate,
          guestCount: input.guestCount,
          specialRequest: input.specialRequest ?? null,
        },
        include: { restaurantTable: true },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientUnknownRequestError &&
      error.message.includes('Reservation_no_overlap') &&
      error.message.includes('23P01')
    ) {
      logger.warn(
        { userId: user.id, restaurantTableId: input.restaurantTableId },
        'Concurrent reservation rejected',
      );
      throw new AppError(
        409,
        'Selected table is not available for this time',
        'RESERVATION_CONFLICT',
      );
    }
    if (error instanceof AppError && error.statusCode === 409)
      logger.warn(
        { userId: user.id, restaurantTableId: input.restaurantTableId },
        'Reservation conflict',
      );
    throw error;
  }
}

type ReservationQuery = z.output<typeof reservationListRequest>['query'];

async function getReservations(query: ReservationQuery, userId?: string) {
  const where: Prisma.ReservationWhereInput = {};
  if (userId) where.userId = userId;
  if (query.status) where.status = query.status;
  if (query.date) {
    const dayStart = new Date(`${query.date}T00:00:00.000Z`);
    where.reservationDate = {
      gte: dayStart,
      lt: new Date(dayStart.getTime() + 86400000),
    };
  }
  const [data, total] = await prisma.$transaction([
    prisma.reservation.findMany({
      where,
      ...paginationArgs(query),
      orderBy: [{ reservationDate: 'desc' }, { id: 'desc' }],
      include: { restaurantTable: true },
    }),
    prisma.reservation.count({ where }),
  ]);
  return { data, total };
}

export function getCustomerReservations(
  userId: string,
  query: ReservationQuery,
) {
  return getReservations(query, userId);
}

export function getAdminReservations(query: ReservationQuery) {
  return getReservations(query);
}

export async function getCustomerReservationById(
  userId: string,
  reservationId: string,
) {
  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, userId },
    include: { restaurantTable: true },
  });
  if (!reservation)
    throw new AppError(404, 'Reservation not found', 'RESERVATION_NOT_FOUND');
  return reservation;
}

export async function getAdminReservationById(reservationId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { restaurantTable: true },
  });
  if (!reservation)
    throw new AppError(404, 'Reservation not found', 'RESERVATION_NOT_FOUND');
  return reservation;
}

export async function cancelReservation(userId: string, reservationId: string) {
  return serializableTransaction(async (transaction) => {
    const reservation = await transaction.reservation.findFirst({
      where: { id: reservationId, userId },
    });
    if (!reservation)
      throw new AppError(404, 'Reservation not found', 'RESERVATION_NOT_FOUND');
    if (reservation.status === 'CANCELLED') return reservation;
    if (
      !blockingReservationStatuses.includes(reservation.status) ||
      reservation.reservationDate.getTime() <= Date.now()
    )
      throw new AppError(
        409,
        'Only upcoming reservations can be cancelled',
        'RESERVATION_NOT_CANCELLABLE',
      );
    return transaction.reservation.update({
      where: { id: reservationId },
      data: { status: 'CANCELLED' },
      include: { restaurantTable: true },
    });
  });
}

export async function updateReservationStatus(
  reservationId: string,
  status: ReservationStatus,
) {
  return serializableTransaction(async (transaction) => {
    const reservation = await transaction.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!reservation)
      throw new AppError(404, 'Reservation not found', 'RESERVATION_NOT_FOUND');
    if (reservation.status !== status) {
      if (!reservationTransitions[reservation.status].includes(status))
        throw new AppError(
          409,
          `Cannot move reservation from ${reservation.status} to ${status}`,
          'INVALID_RESERVATION_TRANSITION',
        );
      if (
        status === 'CONFIRMED' &&
        reservation.reservationDate.getTime() <= Date.now()
      )
        throw new AppError(
          409,
          'Cannot confirm a reservation that has already started',
          'RESERVATION_ALREADY_STARTED',
        );
      if (
        status === 'COMPLETED' &&
        reservation.reservationDate.getTime() > Date.now()
      )
        throw new AppError(
          409,
          'Cannot complete a reservation before it starts',
          'RESERVATION_NOT_STARTED',
        );
    }
    return transaction.reservation.update({
      where: { id: reservationId },
      data: { status },
      include: { restaurantTable: true },
    });
  });
}

