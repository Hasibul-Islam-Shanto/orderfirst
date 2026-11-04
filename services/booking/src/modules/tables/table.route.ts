import { Router } from 'express';
import * as controller from './table.controller.js';
import * as validation from './table.validation.js';
import { validateRequest } from '../../middlewares/validate-request.js';
import {
  authenticateUser,
  authorizeRoles,
} from '../../middlewares/auth-guard.js';

export const tableRouter = Router();

tableRouter.use(authenticateUser, authorizeRoles('ADMIN'));

tableRouter.get(
  '/',
  validateRequest(validation.tableListRequest, controller.getTables),
);

tableRouter.post(
  '/',
  validateRequest(validation.createTableRequest, controller.createTable),
);

tableRouter.patch(
  '/:restaurantTableId',
  validateRequest(validation.updateTableRequest, controller.updateTable),
);

tableRouter.delete(
  '/:restaurantTableId',
  validateRequest(validation.tableRequest, controller.deleteTable),
);

tableRouter.patch(
  '/:restaurantTableId/availability',
  validateRequest(
    validation.tableAvailabilityRequest,
    controller.updateTableAvailability,
  ),
);

