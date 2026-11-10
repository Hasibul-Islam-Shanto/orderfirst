| Task | Status | Notes |
| :--- | :--- | :--- |
| Task 1: Add prom-client dependencies | Done | Added prom-client 15.1.3 to all 6 services and installed packages |
| Task 2: Auth service metrics instrumentation | Done | Telemetry module, /metrics and /metrices endpoints, unit tests (17/17 passing) |
| Task 3: Catalog service metrics instrumentation | Done | Telemetry module, /metrics and /metrices endpoints, unit tests (8/8 passing) |
| Task 4: Booking service metrics instrumentation | Done | Telemetry module, /metrics and /metrices endpoints, unit tests (7/7 passing) |
| Task 5: Orders service metrics instrumentation | Done | Telemetry module, /metrics and /metrices endpoints, unit tests (8/8 passing) |
| Task 6: Notify service metrics instrumentation | Done | Telemetry module, /metrics and /metrices endpoints, unit tests (9/9 passing) |
| Task 7: Gateway service metrics instrumentation | Done | Telemetry module, /metrics and /metrices endpoints, unit tests (8/8 passing) |
| Task 8: Prometheus scraper configuration | Done | Configured prometheus.yml for all 6 microservices with 10s scrape interval |
| Task 9: Loki & Promtail configurations | Done | Configured single-binary loki-config.yml and docker_sd promtail-config.yml |
| Task 10: Grafana datasource and dashboard provisioning | Done | Provisioned Prometheus/Loki datasources, dashboard provider, and fleet overview JSON |
| Task 11: Docker Compose stack orchestration | Done | Added prometheus, loki, promtail, grafana to compose files and env examples |
| Task 12: Fleet verification & full test pass | Done | 57/57 unit tests passed, 0 typecheck errors, client builds cleanly |
