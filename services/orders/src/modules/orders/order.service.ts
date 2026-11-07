import { Prisma, type OrderStatus } from '@prisma/client';
import type { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { logger, errorContext } from '../../config/logger.js';
import { AppError } from '../../errors/app-error.js';
import { serializableTransaction } from '../../utils/transaction.js';
import { paginationArgs } from '../../utils/validation.js';
import { orderTransitions } from './order.constants.js';
import type {
  createOrderRequest,
  orderListRequest,
} from './order.validation.js';
import { fetchCatalogBatchWithRetry } from '../catalog-client/catalog.client.js';
import {
  publishOrderCreated,
  publishOrderStatusUpdated,
} from '../../amqp/publisher.js';

const orderInclude = {
  items: true,
} as const;

export function calculateOrderTotal(
  items: ReadonlyArray<{ unitPrice: Prisma.Decimal; quantity: number }>,
): Prisma.Decimal {
  return items.reduce(
    (subtotal, item) => subtotal.plus(item.unitPrice.mul(item.quantity)),
    new Prisma.Decimal(0),
  );
}

export async function createOrder(
  user: { id: string; name?: string; email?: string },
  input: z.output<typeof createOrderRequest>['body'],
) {
  try {
    const requestedIds = input.items.map((item) => item.menuItemId);
    const catalogItems = await fetchCatalogBatchWithRetry(requestedIds);

    const orderItems = input.items.map((item) => {
      const catalogItem = catalogItems.find(
        (ci) => ci.id === item.menuItemId,
      );
      if (!catalogItem) {
        throw new AppError(
          409,
          'A selected menu item no longer exists',
          'MENU_ITEM_NOT_FOUND',
        );
      }
      if (!catalogItem.isAvailable) {
        throw new AppError(
          409,
          'Menu item is currently unavailable',
          'MENU_ITEM_UNAVAILABLE',
        );
      }
      return {
        menuItemId: catalogItem.id,
        menuItemName: catalogItem.name,
        quantity: item.quantity,
        unitPrice: new Prisma.Decimal(catalogItem.price),
      };
    });

    const subtotal = calculateOrderTotal(orderItems);

    const createdOrder = await serializableTransaction(async (transaction) => {
      return transaction.order.create({
        data: {
          userId: user.id,
          customerName: user.name || 'Valued Customer',
          customerEmail: user.email || 'customer@orderfirst.test',
          orderType: input.orderType,
          notes: input.notes ?? null,
          subtotal,
          total: subtotal,
          items: {
            create: orderItems,
          },
        },
        include: orderInclude,
      });
    });

    publishOrderCreated({
      orderId: createdOrder.id,
      userId: createdOrder.userId,
      status: createdOrder.status,
      customerEmail: createdOrder.customerEmail,
      customerName: createdOrder.customerName,
      total: Number(createdOrder.total).toFixed(2),
      items: createdOrder.items.map((item) => ({
        name: item.menuItemName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice).toFixed(2),
      })),
    });

    return createdOrder;
  } catch (error) {
    logger.warn(
      { userId: user.id, error: errorContext(error) },
      'Order creation failed',
    );
    throw error;
  }
}

type OrderQuery = z.output<typeof orderListRequest>['query'];

async function getOrders(query: OrderQuery, userId?: string) {
  const where: Prisma.OrderWhereInput = {};
  if (userId) where.userId = userId;
  if (query.status) where.status = query.status;
  if (query.search) {
    where.OR = [
      { customerName: { contains: query.search, mode: 'insensitive' } },
      ...(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(query.search)
        ? [{ id: query.search }]
        : []),
    ];
  }
  const [data, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      ...paginationArgs(query),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: orderInclude,
    }),
    prisma.order.count({ where }),
  ]);
  return { data, total };
}

export function getCustomerOrders(userId: string, query: OrderQuery) {
  return getOrders(query, userId);
}

export function getAdminOrders(query: OrderQuery) {
  return getOrders(query);
}

export async function getCustomerOrderById(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: orderInclude,
  });
  if (!order) throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  return order;
}

export async function getAdminOrderById(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });
  if (!order) throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  return order;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const updatedOrder = await serializableTransaction(async (transaction) => {
    const existingOrder = await transaction.order.findUnique({
      where: { id: orderId },
    });
    if (!existingOrder)
      throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
    if (
      existingOrder.status !== status &&
      !orderTransitions[existingOrder.status].includes(status)
    )
      throw new AppError(
        409,
        `Cannot move order from ${existingOrder.status} to ${status}`,
        'INVALID_ORDER_TRANSITION',
      );
    return transaction.order.update({
      where: { id: orderId },
      data: { status },
      include: orderInclude,
    });
  });

  publishOrderStatusUpdated({
    orderId: updatedOrder.id,
    userId: updatedOrder.userId,
    status: updatedOrder.status,
    customerEmail: updatedOrder.customerEmail,
    customerName: updatedOrder.customerName,
  });

  return updatedOrder;
}

export async function cancelOrder(
  userId: string,
  orderId: string,
  isAdmin = false,
) {
  const cancelledOrder = await serializableTransaction(async (transaction) => {
    const existingOrder = await transaction.order.findUnique({
      where: { id: orderId },
    });
    if (!existingOrder)
      throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
    if (!isAdmin && existingOrder.userId !== userId) {
      throw new AppError(403, 'Forbidden', 'FORBIDDEN');
    }
    if (!isAdmin && existingOrder.status !== 'PENDING') {
      throw new AppError(
        409,
        'Only pending orders can be cancelled',
        'CANNOT_CANCEL_ORDER',
      );
    }
    if (!orderTransitions[existingOrder.status].includes('CANCELLED')) {
      throw new AppError(
        409,
        `Cannot cancel order from ${existingOrder.status}`,
        'INVALID_ORDER_TRANSITION',
      );
    }
    return transaction.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
      include: orderInclude,
    });
  });

  publishOrderStatusUpdated({
    orderId: cancelledOrder.id,
    userId: cancelledOrder.userId,
    status: cancelledOrder.status,
    customerEmail: cancelledOrder.customerEmail,
    customerName: cancelledOrder.customerName,
  });

  return cancelledOrder;
}

export async function getOrdersSummary() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [todayOrders, recentOrders, popularGroups] = await Promise.all([
    prisma.order.findMany({
      where: {
        createdAt: { gte: todayStart },
        status: { not: 'CANCELLED' },
      },
      select: { total: true },
    }),
    prisma.order.findMany({
      take: 5,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: orderInclude,
    }),
    prisma.orderItem.groupBy({
      by: ['menuItemId', 'menuItemName'],
      _sum: { quantity: true },
      orderBy: {
        _sum: { quantity: 'desc' },
      },
      take: 5,
    }),
  ]);

  const todayRevenue = todayOrders.reduce(
    (sum, o) => sum + Number(o.total),
    0,
  );

  const popularMenuItems = popularGroups.map((group) => ({
    menuItemId: group.menuItemId,
    name: group.menuItemName,
    quantity: group._sum.quantity ?? 0,
  }));

  return {
    todayRevenue: Number(todayRevenue.toFixed(2)),
    todayOrders: todayOrders.length,
    recentOrders,
    popularMenuItems,
  };
}

