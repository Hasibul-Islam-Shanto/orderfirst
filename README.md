# OrderFirst

OrderFirst is a modern restaurant ordering and table reservation management system.

## Architecture

OrderFirst has been migrated from a monolithic backend into a distributed, production-grade microservices architecture.

### Services Overview

| Service | Port | Description | Status |
| :--- | :--- | :--- | :--- |
| **gateway** | 4000 | Reverse proxy, edge security, rate limiting & session validation | Completed |
| **auth** | 4001 | Customer & admin auth, registration, email OTP verification, JWT | Completed |
| **catalog** | 4002 | Menu categories, items, inventory availability & internal batch queries | Completed |
| **booking** | 4003 | Restaurant tables, reservations & `btree_gist` anti-overlap constraint | Completed |
| **orders** | 4004 | Order placement, state transitions, circuit-breaker catalog sync | Completed |
| **notify** | 4005 | RabbitMQ event consumer, transactional emails & OTP dispatch | Completed |

---

## Directory Structure

- `frontend/` - React, TypeScript, Vite, Tailwind CSS client application (pointing to API Gateway at `:4000`).
- `services/` - Standalone microservices:
  - `gateway/` (Port 4000): API Gateway reverse proxy and edge security
  - `auth/` (Port 4001): Authentication & user identity service (`auth` PostgreSQL schema)
  - `catalog/` (Port 4002): Menu items, categories & batch inventory (`catalog` PostgreSQL schema)
  - `booking/` (Port 4003): Tables & reservations (`booking` PostgreSQL schema with `btree_gist`)
  - `orders/` (Port 4004): Order state machine & catalog circuit breaker (`orders` PostgreSQL schema)
  - `notify/` (Port 4005): Asynchronous notification daemon consuming RabbitMQ events
- `infra/` - Infrastructure definitions:
  - `docker-compose.yml`: Multi-container topology with network isolation & healthchecks
  - `postgres/init/01-init.sql`: Isolated schemas (`auth`, `catalog`, `orders`, `booking`) and dedicated least-privilege roles
  - `rabbitmq/`: Message broker configurations
- `backend/` - Archived legacy monolith documentation (`backend/README.md`).

---

## Running the Application

### 1. Environment Configuration

Copy the example environment matrix:

```bash
cp .env.example .env
```

### 2. Start Infrastructure and Microservices

```bash
cd infra
docker compose up -d --build
```

Verify that the Gateway is healthy and downstream services are connected:

```bash
curl http://localhost:4000/health/ready
```

### 3. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

The client application will run at `http://localhost:5173` and communicate through the Gateway on port `4000`.

---

## Running Tests

Each service has its own independent test suite:

```bash
# Run tests for all services
for svc in auth catalog booking orders notify gateway; do
  echo "Testing $svc..."
  (cd services/$svc && npm test)
done
```
