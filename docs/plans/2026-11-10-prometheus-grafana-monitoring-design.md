# System Design: Prometheus & Grafana Monitoring with Loki Log Aggregation

**Document ID**: `2026-11-10-prometheus-grafana-monitoring-design`  
**Date**: November 10, 2026  
**Status**: Approved  
**Target Services**: `gateway`, `auth`, `catalog`, `booking`, `orders`, `notify`  

---

## 1. Executive Summary
This design establishes unified observability across the OrderFirst microservice architecture. It introduces standard Prometheus metrics endpoints (`/metrics` and `/metrices` aliases) across all 6 Express microservices using `prom-client`, and provisions a full monitoring stack in Docker Compose featuring Prometheus, Grafana, Loki, and Promtail.

In Grafana, engineers can inspect real-time metrics graphs (request rates, latency histograms, error rates, CPU/memory) alongside live streaming container logs, filterable by a dynamic `$service` dropdown selector.

---

## 2. Architecture & Data Flow

```
                     ┌──────────────────────────────────────────────┐
                     │              Grafana Dashboard               │
                     │  [$service dropdown: All | auth | orders...] │
                     └──────────────┬───────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼ (PromQL Queries)              ▼ (LogQL Queries)
           ┌─────────────────┐             ┌─────────────────┐
           │   Prometheus    │             │   Grafana Loki  │
           │  (:9090 Server) │             │  (:3100 Logs)   │
           └────────┬────────┘             └────────▲────────┘
                    │ Scrapes /metrics              │ Pushes logs
                    │ (Internal Docker Network)     │
                    │                               │
                    ▼                     ┌─────────────────┐
       ┌──────────────────────────┐       │    Promtail     │
       │    OrderFirst Fleet      │───────│  (Log Collector)│
       │                          │       └─────────────────┘
       │  • gateway (:4000)       │ (Docker engine socket /
       │  • auth    (:4001)       │  container stdout/stderr)
       │  • catalog (:4002)       │
       │  • booking (:4003)       │
       │  • orders  (:4004)       │
       │  • notify  (:4005)       │
       └──────────────────────────┘
```

### Network Topology
- **Internal Network**: All microservices, Prometheus, Loki, and Promtail communicate directly over the isolated Docker bridge `internal`.
- **Public / Edge Access**:
  - `gateway` (:4000) and `client` (:80) serve user traffic.
  - `prometheus` is accessible at `http://localhost:9090` (configurable via `PROMETHEUS_PORT`).
  - `grafana` is accessible at `http://localhost:3001` (configurable via `GRAFANA_PORT`).

---

## 3. Microservice Metrics Instrumentation

### 3.1 Dependencies
Each of the 6 microservices (`services/{auth,catalog,booking,orders,notify,gateway}`) will add:
- `prom-client`: `^15.1.3`

### 3.2 Telemetry Module (`src/config/metrics.ts`)
Each service implements an isolated registry instance to avoid namespace pollution:
1. **Isolated Registry**: `new promClient.Registry()`
2. **Process & Runtime Metrics**:
   - `promClient.collectDefaultMetrics({ register, prefix: 'orderfirst_' })`
   - Default label attached: `{ service: '<service-name>' }`
   - Captures: Node.js heap memory, resident memory (RSS), CPU user/system time, event loop lag, and active handles.
3. **HTTP Metrics**:
   - `orderfirst_http_requests_total`: Counter tracking all processed requests.
     - Labels: `['service', 'method', 'route', 'status_code']`
   - `orderfirst_http_request_duration_seconds`: Histogram measuring response latency in seconds.
     - Labels: `['service', 'method', 'route', 'status_code']`
     - Buckets: `[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]`

### 3.3 Route Sanitization & Normalization
To prevent cardinality explosion from parameterized URLs (e.g. `/orders/123e4567-e89b-12d3-a456-426614174000`), the middleware extracts:
- Express route template (`req.baseUrl + req.route.path` or `req.route?.path`) when available.
- Fallback regex sanitization: UUIDs and numeric IDs are collapsed to `:id`.
- Strips trailing slashes and query strings.

### 3.4 Dual Endpoints Registration (`src/app.ts`)
Each service registers both `/metrics` and `/metrices`:
```typescript
app.get(['/metrics', '/metrices'], async (_req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.send(await register.metrics());
});
```
- Exempt from rate limiters to ensure Prometheus scrapers are never blocked.
- Bypasses cookie security validation middleware.

---

## 4. Monitoring Stack Configuration

### 4.1 Prometheus (`deploy/monitoring/prometheus/prometheus.yml`)
- Global scrape interval: `15s`
- Scrape timeout: `10s`
- Target configuration:
  ```yaml
  global:
    scrape_interval: 15s
    evaluation_interval: 15s

  scrape_configs:
    - job_name: 'orderfirst-microservices'
      metrics_path: '/metrics'
      static_configs:
        - targets:
            - 'gateway:4000'
            - 'auth:4001'
            - 'catalog:4002'
            - 'booking:4003'
            - 'orders:4004'
            - 'notify:4005'
          labels:
            environment: 'development'
  ```

### 4.2 Loki (`deploy/monitoring/loki/loki-config.yml`)
- Configured in single-binary mode.
- Local filesystem storage for index and chunks (`/loki/index`, `/loki/chunks`).
- Retention period: 168h (7 days).

### 4.3 Promtail (`deploy/monitoring/promtail/promtail-config.yml`)
- Connects to `/var/run/docker.sock` and `/var/lib/docker/containers`.
- Discovers running containers matching `orderfirst-*`.
- Pipeline stages:
  - Extract container name (e.g. `orderfirst-auth` -> `service="auth"`).
  - Ship to `http://loki:3100/loki/api/v1/push`.

### 4.4 Grafana Datasource & Dashboard Provisioning
- **Datasources (`deploy/monitoring/grafana/provisioning/datasources/datasources.yml`)**:
  - `Prometheus`: `http://prometheus:9090` (Default: `true`)
  - `Loki`: `http://loki:3100` (Default: `false`)
- **Dashboard Provider (`deploy/monitoring/grafana/provisioning/dashboards/dashboards.yml`)**:
  - Auto-loads all dashboards from `deploy/monitoring/grafana/dashboards/`.
- **Pre-Built Dashboard (`orderfirst-overview.json`)**:
  - **Variable `$service`**: `All`, `gateway`, `auth`, `catalog`, `booking`, `orders`, `notify`.
  - **Metrics Visualizations**:
    - Service Health Status (green/red UP indicators)
    - Throughput (RPS) per service
    - P50, P95, P99 Latency percentiles
    - HTTP 4xx / 5xx error rate gauges
    - Process Memory (Heap Used / Heap Total) & CPU usage
  - **Live Logs Panel**:
    - Real-time LogQL stream `{container=~"orderfirst-.*"} | json`
    - Filtered dynamically by `$service`
    - Full-text search and log level styling

---

## 5. Docker Compose Infrastructure
The following additions will be placed in `deploy/compose/docker-compose.yml`, `docker-compose.dev.yml`, and `docker-compose.local.yml`:

```yaml
services:
  prometheus:
    image: prom/prometheus:v2.54.1
    container_name: orderfirst-prometheus
    restart: unless-stopped
    volumes:
      - ../monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    ports:
      - "127.0.0.1:${PROMETHEUS_PORT:-9090}:9090"
    networks:
      - internal
      - public

  loki:
    image: grafana/loki:3.1.0
    container_name: orderfirst-loki
    restart: unless-stopped
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - ../monitoring/loki/loki-config.yml:/etc/loki/local-config.yaml:ro
      - loki_data:/loki
    networks:
      - internal

  promtail:
    image: grafana/promtail:3.1.0
    container_name: orderfirst-promtail
    restart: unless-stopped
    volumes:
      - ../monitoring/promtail/promtail-config.yml:/etc/promtail/config.yml:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    command: -config.file=/etc/promtail/config.yml
    networks:
      - internal

  grafana:
    image: grafana/grafana:11.1.0
    container_name: orderfirst-grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_USER=${GRAFANA_ADMIN_USER:-admin}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-admin}
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - ../monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
      - ../monitoring/grafana/dashboards:/var/lib/grafana/dashboards:ro
      - grafana_data:/var/lib/grafana
    ports:
      - "${GRAFANA_PORT:-3001}:3000"
    networks:
      - internal
      - public
    depends_on:
      - prometheus
      - loki

volumes:
  prometheus_data:
  loki_data:
  grafana_data:
```

---

## 6. Verification Plan
1. **Automated Unit & Integration Tests**:
   - Add unit tests in each service verifying `GET /metrics` and `GET /metrices` return `200 OK` with `text/plain` contentType and containing expected metric strings (`orderfirst_http_requests_total`, `orderfirst_process_resident_memory_bytes`).
   - Run `npm test` across all 6 services.
   - Run `npm run typecheck` across all 6 services.
2. **Prometheus Scraping Verification**:
   - Verify all targets are reported in state `UP` on `http://localhost:9090/targets`.
3. **Grafana & Loki Verification**:
   - Open Grafana at `http://localhost:3001` with default admin credentials.
   - Confirm datasources (Prometheus, Loki) test green.
   - Open OrderFirst Overview dashboard and test the `$service` dropdown selector and live log viewer.
