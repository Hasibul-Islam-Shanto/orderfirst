import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { logger, errorContext } from '../config/logger.js';

export async function getAggregatedDashboard(_request: Request, response: Response) {
  const internalHeaders = {
    'X-Internal-Secret': env.INTERNAL_SECRET,
    'X-User-Role': 'ADMIN',
  };

  const results = await Promise.allSettled([
    // Orders Summary
    fetch(`${env.ORDERS_SERVICE_URL}/admin/orders/summary`, {
      headers: internalHeaders,
      signal: AbortSignal.timeout(3000),
    }).then(async (res) => {
      if (!res.ok) throw new Error(`Orders summary error: ${res.status}`);
      return res.json() as Promise<{
        data: {
          todayRevenue: number;
          todayOrders: number;
          recentOrders: any[];
          popularMenuItems: Array<{ menuItemId: string; name: string; quantity: number }>;
        };
      }>;
    }),

    // Booking Summary
    fetch(`${env.BOOKING_SERVICE_URL}/admin/reservations/summary`, {
      headers: internalHeaders,
      signal: AbortSignal.timeout(3000),
    }).then(async (res) => {
      if (!res.ok) throw new Error(`Booking summary error: ${res.status}`);
      return res.json() as Promise<{
        data: {
          upcomingReservations: number;
          availableTables: number;
        };
      }>;
    }),

    // Catalog Menu Items (for enriching dish names, photos, prices)
    fetch(`${env.CATALOG_SERVICE_URL}/menu/items?limit=100`, {
      headers: internalHeaders,
      signal: AbortSignal.timeout(3000),
    }).then(async (res) => {
      if (!res.ok) throw new Error(`Catalog error: ${res.status}`);
      return res.json() as Promise<{ data: any[]; pagination?: any }>;
    }),
  ]);

  const [ordersRes, bookingRes, catalogRes] = results;

  const ordersSummary = ordersRes.status === 'fulfilled' ? ordersRes.value.data : null;
  const bookingSummary = bookingRes.status === 'fulfilled' ? bookingRes.value.data : null;
  const catalogData = catalogRes.status === 'fulfilled' ? catalogRes.value.data : [];

  const todayRevenue = ordersSummary?.todayRevenue ?? 0;
  const todayOrders = ordersSummary?.todayOrders ?? 0;
  const recentOrders = ordersSummary?.recentOrders ?? [];
  const upcomingReservations = bookingSummary?.upcomingReservations ?? 0;
  const availableTables = bookingSummary?.availableTables ?? 0;

  // Build real popular dishes enriched with catalog images
  const popularMenuItems = (ordersSummary?.popularMenuItems ?? [])
    .map((pop) => {
      const catalogItem = catalogData.find((ci: any) => ci.id === pop.menuItemId);
      return {
        menuItem: catalogItem ?? {
          id: pop.menuItemId,
          name: pop.name,
          imageUrl: '',
        },
        quantity: pop.quantity,
      };
    })
    .filter((entry) => Boolean(entry.menuItem));

  const partialFailures = [
    ordersRes.status === 'rejected' ? 'orders' : null,
    bookingRes.status === 'rejected' ? 'booking' : null,
    catalogRes.status === 'rejected' ? 'catalog' : null,
  ].filter(Boolean);

  if (partialFailures.length > 0) {
    logger.warn({ partialFailures }, 'Dashboard aggregation returned partial results');
  }

  return response.json({
    success: true,
    data: {
      todayRevenue: Number(todayRevenue.toFixed(2)),
      todayOrders,
      upcomingReservations,
      availableTables,
      recentOrders,
      popularMenuItems,
      timezone: 'UTC',
      status: partialFailures.length === 0 ? 'healthy' : 'partial',
      degradedServices: partialFailures,
    },
    message: 'Dashboard metrics retrieved',
  });
}

export async function getAggregatedHealthReady(_request: Request, response: Response) {
  const services = [
    { name: 'auth', url: `${env.AUTH_SERVICE_URL}/health/ready` },
    { name: 'catalog', url: `${env.CATALOG_SERVICE_URL}/health/ready` },
    { name: 'orders', url: `${env.ORDERS_SERVICE_URL}/health/ready` },
    { name: 'booking', url: `${env.BOOKING_SERVICE_URL}/health/ready` },
    { name: 'notify', url: `${env.NOTIFY_SERVICE_URL}/health/ready` },
  ];

  const checks = await Promise.allSettled(
    services.map(async ({ name, url }) => {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { name, status: 'ready' };
    }),
  );

  const statuses: Record<string, string> = { gateway: 'ready' };
  let allHealthy = true;

  checks.forEach((check, index) => {
    const serviceName = services[index]?.name ?? 'unknown';
    if (check.status === 'fulfilled') {
      statuses[serviceName] = 'ready';
    } else {
      statuses[serviceName] = 'unavailable';
      allHealthy = false;
      logger.warn(
        { service: serviceName, error: errorContext(check.reason) },
        'Downstream service readiness check failed',
      );
    }
  });

  return response
    .status(allHealthy ? 200 : 503)
    .json({ status: allHealthy ? 'ready' : 'degraded', services: statuses });
}
