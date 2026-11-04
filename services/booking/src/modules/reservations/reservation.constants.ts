import type { ReservationStatus } from '@prisma/client';

export const reservationDurationMinutes = 90;

export const blockingReservationStatuses: ReservationStatus[] = [
  'PENDING',
  'CONFIRMED',
];

export const reservationTransitions: Record<
  ReservationStatus,
  readonly ReservationStatus[]
> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED', 'COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

