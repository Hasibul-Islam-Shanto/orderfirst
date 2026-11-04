import type { Request, Response } from 'express';
import type { z } from 'zod';
import type * as validation from './reservation.validation.js';
import * as service from './reservation.service.js';
import { sendSuccess, sendList } from '../../utils/response.js';
import { requireUser } from '../../middlewares/auth-guard.js';

export async function findAvailableTables(
  _request: Request,
  response: Response,
  input: z.output<typeof validation.availabilityRequest>,
) {
  const tables = await service.findAvailableTables(
    input.query.reservationDate,
    input.query.guestCount,
  );
  return sendSuccess(response, tables, 'Available tables retrieved');
}

export async function createReservation(
  request: Request,
  response: Response,
  input: z.output<typeof validation.createReservationRequest>,
) {
  const user = requireUser(request);
  const reservation = await service.createReservation(user, input.body);
  return sendSuccess(
    response,
    reservation,
    'Reservation created successfully',
    201,
  );
}

export async function getCustomerReservations(
  request: Request,
  response: Response,
  input: z.output<typeof validation.reservationListRequest>,
) {
  const user = requireUser(request);
  return sendList(
    response,
    await service.getCustomerReservations(user.id, input.query),
    input.query.page,
    input.query.limit,
    'Reservations retrieved successfully',
  );
}

export async function getCustomerReservationById(
  request: Request,
  response: Response,
  input: z.output<typeof validation.reservationRequest>,
) {
  const user = requireUser(request);
  return sendSuccess(
    response,
    await service.getCustomerReservationById(
      user.id,
      input.params.reservationId,
    ),
    'Reservation retrieved successfully',
  );
}

export async function getAdminReservations(
  _request: Request,
  response: Response,
  input: z.output<typeof validation.reservationListRequest>,
) {
  return sendList(
    response,
    await service.getAdminReservations(input.query),
    input.query.page,
    input.query.limit,
    'Reservations retrieved successfully',
  );
}

export async function getAdminReservationById(
  _request: Request,
  response: Response,
  input: z.output<typeof validation.reservationRequest>,
) {
  return sendSuccess(
    response,
    await service.getAdminReservationById(input.params.reservationId),
    'Reservation retrieved successfully',
  );
}

export async function cancelReservation(
  request: Request,
  response: Response,
  input: z.output<typeof validation.reservationRequest>,
) {
  const user = requireUser(request);
  return sendSuccess(
    response,
    await service.cancelReservation(user.id, input.params.reservationId),
    'Reservation cancelled successfully',
  );
}

export async function updateReservationStatus(
  _request: Request,
  response: Response,
  input: z.output<typeof validation.reservationStatusRequest>,
) {
  return sendSuccess(
    response,
    await service.updateReservationStatus(
      input.params.reservationId,
      input.body.status,
    ),
    'Reservation status updated successfully',
  );
}

