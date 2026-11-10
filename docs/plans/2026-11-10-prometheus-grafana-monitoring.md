# Prometheus, Loki & Grafana Monitoring Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement Prometheus `/metrics` and `/metrices` telemetry endpoints across all 6 microservices, and deploy a full monitoring stack with Prometheus, Loki, Promtail, and Grafana in Docker Compose.

**Architecture:** Each microservice implements an isolated `prom-client` registry exposing default Node.js process metrics and custom HTTP request duration/counter metrics on `/metrics` and `/metrices`. Prometheus scrapes targets over the Docker internal bridge network every 15s; Promtail captures container logs into Loki; Grafana aggregates both into a unified fleet dashboard with a dynamic service selector.

**Tech Stack:** Node.js 22, TypeScript, Express 5, `prom-client` 15.1.3, Vitest, Supertest, Prometheus v2.54.1, Grafana Loki v3.1.0, Promtail v3.1.0, Grafana v11.1.0, Docker Compose.

---

### Task 1: Add `prom-client` Dependencies to All Microservices

**Files:**
- Modify: `services/auth/package.json`
- Modify: `services/catalog/package.json`
- Modify: `services/booking/package.json`
- Modify: `services/orders/package.json`
- Modify: `services/notify/package.json`
- Modify: `services/gateway/package.json`

**Step 1: Add `prom-client` to each service's package.json**
Add `"prom-client": "^15.1.3"` to `"dependencies"` in all 6 services.

**Step 2: Install dependencies**
Run: `npm install --prefix services/auth && npm install --prefix services/catalog && npm install --prefix services/booking && npm install --prefix services/orders && npm install --prefix services/notify && npm install --prefix services/gateway`
Expected: packages installed successfully without peer dependency conflicts.

**Step 3: Commit**
```bash
git add services/*/package.json services/*/package-lock.json
git commit -m "chore(deps): add prom-client to all microservices"
```

---

### Task 2: Auth Service Metrics Instrumentation

**Files:**
- Create: `services/auth/src/config/metrics.ts`
- Create: `services/auth/tests/metrics.unit.test.ts`
- Modify: `services/auth/src/app.ts`

**Step 1: Write the failing test**
Create `services/auth/tests/metrics.unit.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('Auth Service Metrics Telemetry Endpoints', () => {
  const app = createApp();

  it('exposes Prometheus metrics on /metrics with text/plain contentType', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('orderfirst_http_requests_total');
    expect(res.text).toContain('orderfirst_http_request_duration_seconds');
    expect(res.text).toContain('service="auth"');
  });

  it('exposes identical Prometheus metrics on /metrices alias', async () => {
    const res = await request(app).get('/metrices');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('orderfirst_http_requests_total');
    expect(res.text).toContain('service="auth"');
  });
});
```

**Step 2: Run test to verify it fails**
Run: `npm --prefix services/auth test -- tests/metrics.unit.test.ts`
Expected: FAIL (404 Route not found or route unhandled).

**Step 3: Implement metrics module and register endpoints**
Create `services/auth/src/config/metrics.ts`:
```typescript
import promClient from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

export function createMetrics(serviceName: string) {
  const register = new promClient.Registry();
  register.setDefaultLabels({ service: serviceName });

  promClient.collectDefaultMetrics({ register, prefix: 'orderfirst_' });

  const httpRequestsTotal = new promClient.Counter({
    name: 'orderfirst_http_requests_total',
    help: 'Total number of HTTP requests processed',
    labelNames: ['service', 'method', 'route', 'status_code'],
    registers: [register],
  });

  const httpRequestDurationSeconds = new promClient.Histogram({
    name: 'orderfirst_http_request_duration_seconds',
    help: 'Histogram of HTTP request durations in seconds',
    labelNames: ['service', 'method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register],
  });

  function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
    if (req.path === '/metrics' || req.path === '/metrices' || req.path === '/health') {
      return next();
    }
    const started = performance.now();
    res.on('finish', () => {
      const durationSeconds = (performance.now() - started) / 1000;
      const route = req.route?.path || req.baseUrl || req.path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
      const labels = {
        service: serviceName,
        method: req.method,
        route,
        status_code: String(res.statusCode),
      };
      httpRequestsTotal.inc(labels);
      httpRequestDurationSeconds.observe(labels, durationSeconds);
    });
    next();
  }

  return { register, metricsMiddleware };
}

export const metrics = createMetrics('auth');
```

Update `services/auth/src/app.ts`:
Mount `app.use(metrics.metricsMiddleware);` early in the middleware pipeline, and add:
```typescript
app.get(['/metrics', '/metrices'], async (_request, response) => {
  response.setHeader('Content-Type', metrics.register.contentType);
  response.send(await metrics.register.metrics());
});
```

**Step 4: Run test to verify it passes**
Run: `npm --prefix services/auth test -- tests/metrics.unit.test.ts && npm --prefix services/auth run typecheck`
Expected: PASS with 2 tests passing and 0 typecheck errors.

**Step 5: Commit**
```bash
git add services/auth/src/config/metrics.ts services/auth/src/app.ts services/auth/tests/metrics.unit.test.ts
git commit -m "feat(auth): expose prometheus metrics on /metrics and /metrices"
```

---

### Task 3: Catalog Service Metrics Instrumentation

**Files:**
- Create: `services/catalog/src/config/metrics.ts`
- Create: `services/catalog/tests/metrics.unit.test.ts`
- Modify: `services/catalog/src/app.ts`

**Step 1: Write the failing test**
Create `services/catalog/tests/metrics.unit.test.ts` verifying `/metrics` and `/metrices` return `service="catalog"`.

**Step 2: Run test to verify it fails**
Run: `npm --prefix services/catalog test -- tests/metrics.unit.test.ts`
Expected: FAIL.

**Step 3: Implement metrics module and mount in app.ts**
Create `services/catalog/src/config/metrics.ts` with service `'catalog'`. Mount in `services/catalog/src/app.ts`.

**Step 4: Run test to verify it passes**
Run: `npm --prefix services/catalog test -- tests/metrics.unit.test.ts && npm --prefix services/catalog run typecheck`
Expected: PASS.

**Step 5: Commit**
```bash
git add services/catalog/src/config/metrics.ts services/catalog/src/app.ts services/catalog/tests/metrics.unit.test.ts
git commit -m "feat(catalog): expose prometheus metrics on /metrics and /metrices"
```

---

### Task 4: Booking Service Metrics Instrumentation

**Files:**
- Create: `services/booking/src/config/metrics.ts`
- Create: `services/booking/tests/metrics.unit.test.ts`
- Modify: `services/booking/src/app.ts`

**Step 1: Write the failing test**
Create `services/booking/tests/metrics.unit.test.ts` verifying `/metrics` and `/metrices` return `service="booking"`.

**Step 2: Run test to verify it fails**
Run: `npm --prefix services/booking test -- tests/metrics.unit.test.ts`
Expected: FAIL.

**Step 3: Implement metrics module and mount in app.ts**
Create `services/booking/src/config/metrics.ts` with service `'booking'`. Mount in `services/booking/src/app.ts`.

**Step 4: Run test to verify it passes**
Run: `npm --prefix services/booking test -- tests/metrics.unit.test.ts && npm --prefix services/booking run typecheck`
Expected: PASS.

**Step 5: Commit**
```bash
git add services/booking/src/config/metrics.ts services/booking/src/app.ts services/booking/tests/metrics.unit.test.ts
git commit -m "feat(booking): expose prometheus metrics on /metrics and /metrices"
```

---

### Task 5: Orders Service Metrics Instrumentation

**Files:**
- Create: `services/orders/src/config/metrics.ts`
- Create: `services/orders/tests/metrics.unit.test.ts`
- Modify: `services/orders/src/app.ts`

**Step 1: Write the failing test**
Create `services/orders/tests/metrics.unit.test.ts` verifying `/metrics` and `/metrices` return `service="orders"`.

**Step 2: Run test to verify it fails**
Run: `npm --prefix services/orders test -- tests/metrics.unit.test.ts`
Expected: FAIL.

**Step 3: Implement metrics module and mount in app.ts**
Create `services/orders/src/config/metrics.ts` with service `'orders'`. Mount in `services/orders/src/app.ts`.

**Step 4: Run test to verify it passes**
Run: `npm --prefix services/orders test -- tests/metrics.unit.test.ts && npm --prefix services/orders run typecheck`
Expected: PASS.

**Step 5: Commit**
```bash
git add services/orders/src/config/metrics.ts services/orders/src/app.ts services/orders/tests/metrics.unit.test.ts
git commit -m "feat(orders): expose prometheus metrics on /metrics and /metrices"
```

---

### Task 6: Notify Service Metrics Instrumentation

**Files:**
- Create: `services/notify/src/config/metrics.ts`
- Create: `services/notify/tests/metrics.unit.test.ts`
- Modify: `services/notify/src/app.ts`

**Step 1: Write the failing test**
Create `services/notify/tests/metrics.unit.test.ts` verifying `/metrics` and `/metrices` return `service="notify"`.

**Step 2: Run test to verify it fails**
Run: `npm --prefix services/notify test -- tests/metrics.unit.test.ts`
Expected: FAIL.

**Step 3: Implement metrics module and mount in app.ts**
Create `services/notify/src/config/metrics.ts` with service `'notify'`. Mount in `services/notify/src/app.ts`.

**Step 4: Run test to verify it passes**
Run: `npm --prefix services/notify test -- tests/metrics.unit.test.ts && npm --prefix services/notify run typecheck`
Expected: PASS.

**Step 5: Commit**
```bash
git add services/notify/src/config/metrics.ts services/notify/src/app.ts services/notify/tests/metrics.unit.test.ts
git commit -m "feat(notify): expose prometheus metrics on /metrics and /metrices"
```

---

### Task 7: Gateway Service Metrics Instrumentation

**Files:**
- Create: `services/gateway/src/config/metrics.ts`
- Create: `services/gateway/tests/metrics.unit.test.ts`
- Modify: `services/gateway/src/app.ts`

**Step 1: Write the failing test**
Create `services/gateway/tests/metrics.unit.test.ts` verifying `/metrics` and `/metrices` return `service="gateway"`.

**Step 2: Run test to verify it fails**
Run: `npm --prefix services/gateway test -- tests/metrics.unit.test.ts`
Expected: FAIL.

**Step 3: Implement metrics module and mount in app.ts**
Create `services/gateway/src/config/metrics.ts` with service `'gateway'`. Mount in `services/gateway/src/app.ts`.

**Step 4: Run test to verify it passes**
Run: `npm --prefix services/gateway test -- tests/metrics.unit.test.ts && npm --prefix services/gateway run typecheck`
Expected: PASS.

**Step 5: Commit**
```bash
git add services/gateway/src/config/metrics.ts services/gateway/src/app.ts services/gateway/tests/metrics.unit.test.ts
git commit -m "feat(gateway): expose prometheus metrics on /metrics and /metrices"
```

---

### Task 8: Prometheus Scraper Configuration

**Files:**
- Create: `deploy/monitoring/prometheus/prometheus.yml`

**Step 1: Write `prometheus.yml`**
Define scrape job for all 6 services (`gateway:4000`, `auth:4001`, `catalog:4002`, `booking:4003`, `orders:4004`, `notify:4005`) with 15s interval.

**Step 2: Validate yaml syntax**
Run syntax check / linter on yaml structure.

**Step 3: Commit**
```bash
git add deploy/monitoring/prometheus/prometheus.yml
git commit -m "feat(monitoring): configure prometheus scraper for all microservices"
```

---

### Task 9: Loki & Promtail Configurations

**Files:**
- Create: `deploy/monitoring/loki/loki-config.yml`
- Create: `deploy/monitoring/promtail/promtail-config.yml`

**Step 1: Write `loki-config.yml`**
Single-binary filesystem storage configuration on port 3100.

**Step 2: Write `promtail-config.yml`**
Docker engine log scraper targeting container names `orderfirst-*` and attaching label `service`.

**Step 3: Commit**
```bash
git add deploy/monitoring/loki/loki-config.yml deploy/monitoring/promtail/promtail-config.yml
git commit -m "feat(monitoring): configure loki log storage and promtail container log collector"
```

---

### Task 10: Grafana Datasource and Pre-Built Dashboard Provisioning

**Files:**
- Create: `deploy/monitoring/grafana/provisioning/datasources/datasources.yml`
- Create: `deploy/monitoring/grafana/provisioning/dashboards/dashboards.yml`
- Create: `deploy/monitoring/grafana/dashboards/orderfirst-overview.json`

**Step 1: Write datasources provisioning**
Register Prometheus as default datasource (`http://prometheus:9090`) and Loki (`http://loki:3100`).

**Step 2: Write dashboard provider configuration**
Point Grafana to `/var/lib/grafana/dashboards`.

**Step 3: Create `orderfirst-overview.json`**
Craft full dashboard definition containing:
- Variable `$service` (`All`, `gateway`, `auth`, `catalog`, `booking`, `orders`, `notify`)
- Status badges (Service UP / DOWN)
- RPS graph by service
- P50, P95, P99 latency percentiles
- 4xx & 5xx error rate gauges
- Node.js Heap Used vs Heap Total graph
- Live streaming Loki Logs viewer with search and log level styling

**Step 4: Commit**
```bash
git add deploy/monitoring/grafana/
git commit -m "feat(monitoring): provision grafana prometheus/loki datasources and unified fleet dashboard"
```

---

### Task 11: Docker Compose Stack Orchestration

**Files:**
- Modify: `deploy/compose/docker-compose.yml`
- Modify: `deploy/compose/docker-compose.dev.yml`
- Modify: `deploy/compose/docker-compose.local.yml`
- Modify: `.env.example`, `.env.dev.example`, `.env.local.example`, `.env.prod.example`

**Step 1: Add monitoring services and volumes to Docker Compose files**
Add `prometheus`, `loki`, `promtail`, and `grafana` services with volume declarations `prometheus_data`, `loki_data`, `grafana_data`.

**Step 2: Add default environment variables to env files**
Add `PROMETHEUS_PORT=9090`, `GRAFANA_PORT=3001`, `GRAFANA_ADMIN_USER=admin`, `GRAFANA_ADMIN_PASSWORD=admin`.

**Step 3: Validate Compose file syntax**
Run: `docker compose -f deploy/compose/docker-compose.yml config > /dev/null`
Expected: 0 exit code (valid compose syntax).

**Step 4: Commit**
```bash
git add deploy/compose/ .env*.example
git commit -m "feat(monitoring): integrate prometheus, loki, promtail, and grafana into docker compose"
```

---

### Task 12: Fleet Verification & Full Test Pass

**Files:**
- Test all 6 microservices

**Step 1: Run all microservice test suites**
Run: `npm --prefix services/auth test && npm --prefix services/catalog test && npm --prefix services/booking test && npm --prefix services/orders test && npm --prefix services/notify test && npm --prefix services/gateway test`
Expected: 100% tests pass.

**Step 2: Run all microservice typechecks**
Run: `npm --prefix services/auth run typecheck && npm --prefix services/catalog run typecheck && npm --prefix services/booking run typecheck && npm --prefix services/orders run typecheck && npm --prefix services/notify run typecheck && npm --prefix services/gateway run typecheck`
Expected: 0 typecheck errors.

**Step 3: Update documentation & tracking**
Update `docs/plans/task.md` with completed implementation checklist.
Commit final verification:
```bash
git add docs/plans/task.md
git commit -m "chore(monitoring): verify full microservices telemetry test pass"
```
