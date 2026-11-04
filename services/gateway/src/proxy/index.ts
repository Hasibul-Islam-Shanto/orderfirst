import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { env } from '../config/env.js';

function createServiceProxy(target: string) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (_path, req) => (req as any).originalUrl ?? _path,
    on: {
      proxyReq: (proxyReq, req: any) => {
        proxyReq.setHeader('x-internal-secret', env.INTERNAL_SECRET);
        if (req.user) {
          proxyReq.setHeader('x-user-id', req.user.id);
          proxyReq.setHeader('x-user-role', req.user.role);
          if (req.user.name) proxyReq.setHeader('x-user-name', req.user.name);
          if (req.user.email) proxyReq.setHeader('x-user-email', req.user.email);
        }
        if (req.requestId) {
          proxyReq.setHeader('x-request-id', req.requestId);
        }
        fixRequestBody(proxyReq, req);
      },
    },
  });
}

export const authProxy = createServiceProxy(env.AUTH_SERVICE_URL);
export const catalogProxy = createServiceProxy(env.CATALOG_SERVICE_URL);
export const ordersProxy = createServiceProxy(env.ORDERS_SERVICE_URL);
export const bookingProxy = createServiceProxy(env.BOOKING_SERVICE_URL);

