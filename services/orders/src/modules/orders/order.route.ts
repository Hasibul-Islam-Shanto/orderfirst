import { Router } from 'express';
import * as controller from './order.controller.js';
import * as validation from './order.validation.js';
import { validateRequest } from '../../middlewares/validate-request.js';
import {
  authenticateUser,
  authorizeRoles,
} from '../../middlewares/auth-guard.js';

export const orderRouter = Router();

orderRouter.post(
  '/',
  authenticateUser,
  authorizeRoles('CUSTOMER', 'ADMIN'),
  validateRequest(validation.createOrderRequest, controller.createOrder),
);

orderRouter.get(
  '/',
  authenticateUser,
  authorizeRoles('CUSTOMER', 'ADMIN'),
  validateRequest(validation.orderListRequest, controller.getCustomerOrders),
);

orderRouter.get(
  '/:orderId',
  authenticateUser,
  authorizeRoles('CUSTOMER', 'ADMIN'),
  validateRequest(validation.orderRequest, controller.getCustomerOrderById),
);

orderRouter.patch(
  '/:orderId/cancel',
  authenticateUser,
  authorizeRoles('CUSTOMER', 'ADMIN'),
  validateRequest(validation.orderRequest, controller.cancelOrder),
);

export const adminOrderRouter = Router();

adminOrderRouter.get(
  '/summary',
  authenticateUser,
  authorizeRoles('ADMIN'),
  controller.getOrdersSummary,
);

adminOrderRouter.get(
  '/',
  authenticateUser,
  authorizeRoles('ADMIN'),
  validateRequest(validation.orderListRequest, controller.getAdminOrders),
);

adminOrderRouter.get(
  '/:orderId',
  authenticateUser,
  authorizeRoles('ADMIN'),
  validateRequest(validation.orderRequest, controller.getAdminOrderById),
);

adminOrderRouter.patch(
  '/:orderId/status',
  authenticateUser,
  authorizeRoles('ADMIN'),
  validateRequest(validation.orderStatusRequest, controller.updateOrderStatus),
);

