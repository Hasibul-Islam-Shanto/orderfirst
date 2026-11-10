import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('Gateway Service Metrics Telemetry Endpoints', () => {
  const app = createApp();

  it('exposes Prometheus metrics on /metrics with text/plain contentType', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('orderfirst_http_requests_total');
    expect(res.text).toContain('orderfirst_http_request_duration_seconds');
    expect(res.text).toContain('service="gateway"');
  });

  it('exposes identical Prometheus metrics on /metrices alias', async () => {
    const res = await request(app).get('/metrices');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('orderfirst_http_requests_total');
    expect(res.text).toContain('service="gateway"');
  });
});
