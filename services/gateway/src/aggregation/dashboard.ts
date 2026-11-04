import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { logger, errorContext } from '../config/logger.js';

export async function getAggregatedDashboard(_request: Request, response: Response) {
  const internalHeaders = {
    'X-Internal-Secret': env.INTERNAL_SECRET,
    'X-User-Role': 'ADMIN',
  };

  const results = await Promise.allSettled([
    // Orders
    fetch(`${env.ORDERS_SERVICE_URL}/admin/orders`, {
      headers: internalHeaders,
      signal: AbortSignal.timeout(3000),
    }).then(async (res) => {
      if (!res.ok) throw new Error(`Orders error: ${res.status}`);
      return res.json() as Promise<{ data: any[]; pagination?: any }>;
    }),

    // Booking Reservations
    fetch(`${env.BOOKING_SERVICE_URL}/admin/reservations`, {
      headers: internalHeaders,
      signal: AbortSignal.timeout(3000),
    }).then(async (res) => {
      if (!res.ok) throw new Error(`Booking error: ${res.status}`);
      return res.json() as Promise<{ data: any[]; pagination?: any }>;
    }),

    // Booking Tables
    fetch(`${env.BOOKING_SERVICE_URL}/admin/tables`, {
      headers: internalHeaders,
      signal: AbortSignal.timeout(3000),
    }).then(async (res) => {
      if (!res.ok) throw new Error(`Tables error: ${res.status}`);
      return res.json() as Promise<{ data: any[]; pagination?: any }>;
    }),

    // Catalog Menu Items
    fetch(`${env.CATALOG_SERVICE_URL}/menu/items`, {
      headers: internalHeaders,
      signal: AbortSignal.timeout(3000),
    }).then(async (res) => {
      if (!res.ok) throw new Error(`Catalog error: ${res.status}`);
      return res.json() as Promise<{ data: any[]; pagination?: any }>;
    }),
  ]);

  const [ordersRes, reservationsRes, tablesRes, catalogRes] = results;

  const ordersData = ordersRes.status === 'fulfilled' ? ordersRes.value.data : [];
  const reservationsData = reservationsRes.status === 'fulfilled' ? reservationsRes.value.data : [];
  const tablesData = tablesRes.status === 'fulfilled' ? tablesRes.value.data : [];
  const catalogData = catalogRes.status === 'fulfilled' ? catalogRes.value.data : [];

  const todayRevenue = ordersData.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
  const todayOrders = ordersData.length;
  const upcomingReservations = reservationsData.filter(
    (r: any) => r.status === 'PENDING' || r.status === 'CONFIRMED',
  ).length;
  const availableTables = tablesData.filter((t: any) => t.isAvailable).length;

  const partialFailures = [
    ordersRes.status === 'rejected' ? 'orders' : null,
    reservationsRes.status === 'rejected' ? 'reservations' : null,
    tablesRes.status === 'rejected' ? 'tables' : null,
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
      recentOrders: ordersData.slice(0, 5),
      popularMenuItems: catalogData.slice(0, 5).map((item: any) => ({
        menuItem: item,
        quantity: 1,
      })),
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

  const results = await Promise.allSettled(
    services.map(async (svc) => {
      const res = await fetch(svc.url, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) throw new Error(`${svc.name} reported ${res.status}`);
      return { name: svc.name, status: 'ready' };
    }),
  );

  const checks: Record<string, string> = {};
  let allReady = true;

  services.forEach((svc, index) => {
    const outcome = results[index];
    if (outcome && outcome.status === 'fulfilled') {
      checks[svc.name] = 'ready';
    } else {
      checks[svc.name] = 'unavailable';
      allReady = false;
    }
  });

  const statusCode = allReady ? 200 : 503;
  return response.status(statusCode).json({
    status: allReady ? 'ready' : 'degraded',
    service: 'gateway',
    downstream: checks,
  });
}

