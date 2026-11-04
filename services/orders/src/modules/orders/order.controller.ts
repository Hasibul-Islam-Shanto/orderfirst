import type { Request, Response } from 'express';
import type { z } from 'zod';
import type * as validation from './order.validation.js';
import * as service from './order.service.js';
import { requireUser } from '../../middlewares/auth-guard.js';
import { sendSuccess, sendList } from '../../utils/response.js';

export async function createOrder(
  request: Request,
  response: Response,
  input: z.output<typeof validation.createOrderRequest>,
) {
  const user = requireUser(request);
  const order = await service.createOrder(user, input.body);
  return sendSuccess(
    response,
    order,
    'Order created successfully',
    201,
  );
}

export async function getCustomerOrders(
  request: Request,
  response: Response,
  input: z.output<typeof validation.orderListRequest>,
) {
  const user = requireUser(request);
  return sendList(
    response,
    await service.getCustomerOrders(user.id, input.query),
    input.query.page,
    input.query.limit,
    'Orders retrieved successfully',
  );
}

export async function getAdminOrders(
  _request: Request,
  response: Response,
  input: z.output<typeof validation.orderListRequest>,
) {
  return sendList(
    response,
    await service.getAdminOrders(input.query),
    input.query.page,
    input.query.limit,
    'Orders retrieved successfully',
  );
}

export async function getCustomerOrderById(
  request: Request,
  response: Response,
  input: z.output<typeof validation.orderRequest>,
) {
  const user = requireUser(request);
  return sendSuccess(
    response,
    await service.getCustomerOrderById(user.id, input.params.orderId),
    'Order retrieved successfully',
  );
}

export async function getAdminOrderById(
  _request: Request,
  response: Response,
  input: z.output<typeof validation.orderRequest>,
) {
  return sendSuccess(
    response,
    await service.getAdminOrderById(input.params.orderId),
    'Order retrieved successfully',
  );
}

export async function updateOrderStatus(
  _request: Request,
  response: Response,
  input: z.output<typeof validation.orderStatusRequest>,
) {
  return sendSuccess(
    response,
    await service.updateOrderStatus(input.params.orderId, input.body.status),
    'Order status updated successfully',
  );
}

