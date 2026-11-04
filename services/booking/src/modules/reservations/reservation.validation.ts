import { z } from 'zod';
import { ReservationStatus } from '@prisma/client';
import {
  paginationSchema,
  uuidSchema,
  dateTimeSchema,
} from '../../utils/validation.js';

const guestCount = z
  .number()
  .int()
  .min(1, 'Guest count must be at least 1')
  .max(8, 'Online reservations support up to 8 guests');

const futureDate = dateTimeSchema.refine(
  (date) => date.getTime() > Date.now(),
  'Reservation must be scheduled for a future time',
);

export const availabilityRequest = z.object({
  query: z.strictObject({
    reservationDate: futureDate,
    guestCount: z.coerce.number().int().min(1).max(8),
  }),
});

export const createReservationRequest = z.object({
  body: z.strictObject({
    restaurantTableId: uuidSchema,
    reservationDate: futureDate,
    guestCount,
    specialRequest: z.string().trim().max(500).optional(),
  }),
});

export const reservationRequest = z.object({
  params: z.object({ reservationId: uuidSchema }),
});

export const reservationListRequest = z.object({
  query: paginationSchema
    .extend({
      status: z.enum(ReservationStatus).optional(),
      date: z.iso.date().optional(),
    })
    .strict(),
});

export const reservationStatusRequest = reservationRequest.extend({
  body: z.strictObject({ status: z.enum(ReservationStatus) }),
});

