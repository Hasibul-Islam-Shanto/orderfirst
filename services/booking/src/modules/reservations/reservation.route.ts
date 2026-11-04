import { Router } from 'express';
import * as controller from './reservation.controller.js';
import * as validation from './reservation.validation.js';
import { validateRequest } from '../../middlewares/validate-request.js';
import {
  authenticateUser,
  authorizeRoles,
} from '../../middlewares/auth-guard.js';

export const reservationRouter = Router();

// Public availability check
reservationRouter.get(
  '/availability',
  validateRequest(
    validation.availabilityRequest,
    controller.findAvailableTables,
  ),
);

// Customer reservation routes
reservationRouter.post(
  '/',
  authenticateUser,
  authorizeRoles('CUSTOMER', 'ADMIN'),
  validateRequest(
    validation.createReservationRequest,
    controller.createReservation,
  ),
);

reservationRouter.get(
  '/',
  authenticateUser,
  authorizeRoles('CUSTOMER', 'ADMIN'),
  validateRequest(
    validation.reservationListRequest,
    controller.getCustomerReservations,
  ),
);

reservationRouter.get(
  '/:reservationId',
  authenticateUser,
  authorizeRoles('CUSTOMER', 'ADMIN'),
  validateRequest(
    validation.reservationRequest,
    controller.getCustomerReservationById,
  ),
);

reservationRouter.patch(
  '/:reservationId/cancel',
  authenticateUser,
  authorizeRoles('CUSTOMER', 'ADMIN'),
  validateRequest(validation.reservationRequest, controller.cancelReservation),
);

// Admin reservation routes
export const adminReservationRouter = Router();

adminReservationRouter.get(
  '/',
  authenticateUser,
  authorizeRoles('ADMIN'),
  validateRequest(
    validation.reservationListRequest,
    controller.getAdminReservations,
  ),
);

adminReservationRouter.get(
  '/:reservationId',
  authenticateUser,
  authorizeRoles('ADMIN'),
  validateRequest(
    validation.reservationRequest,
    controller.getAdminReservationById,
  ),
);

adminReservationRouter.patch(
  '/:reservationId/status',
  authenticateUser,
  authorizeRoles('ADMIN'),
  validateRequest(
    validation.reservationStatusRequest,
    controller.updateReservationStatus,
  ),
);

