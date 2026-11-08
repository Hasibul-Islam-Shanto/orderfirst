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

- `client/` - React, TypeScript, Vite, Tailwind CSS client application (pointing to API Gateway at `:4000`).
- `services/` - Standalone microservices:
  - `gateway/` (Port 4000): API Gateway reverse proxy and edge security
  - `auth/` (Port 4001): Authentication & user identity service (`auth` PostgreSQL schema)
  - `catalog/` (Port 4002): Menu items, categories & batch inventory (`catalog` PostgreSQL schema)
  - `booking/` (Port 4003): Tables & reservations (`booking` PostgreSQL schema with `btree_gist`)
  - `orders/` (Port 4004): Order state machine & catalog circuit breaker (`orders` PostgreSQL schema)
  - `notify/` (Port 4005): Asynchronous notification daemon consuming RabbitMQ events
- `infra/` - Infrastructure definitions:
  - `postgres/init/01-init.sh`: Dynamic isolated schemas (`auth`, `catalog`, `orders`, `booking`) and dedicated least-privilege roles
  - `rabbitmq/`: Message broker configurations
- `deploy/` - Deployment hub:
  - `compose/`: Docker Compose configurations (multi-container topologies for dev, staging, prod)
  - `jenkins/`: CI/CD pipelines
  - `monitoring/`: Prometheus & Grafana configurations
  - `proxy/`: Edge reverse proxy (Nginx)
  - `scripts/`: Deployment & healthcheck automation scripts

---

## Running the Application

OrderFirst provides dedicated configurations for **local development**, **containerized dev/staging**, and **hardened production**.

### Environments Overview

| Environment | Compose File | Environment File | Network Topology | Features |
| :--- | :--- | :--- | :--- | :--- |
| **Local** | `deploy/compose/docker-compose.local.yml` | `.env.local` *(or `.env`)* | Direct host port mapping (`4000-4005`, `5433`, `5672`, `15672`, `5173`) | Fast developer feedback, local DB migrations, Vite hot reload support |
| **Dev / Staging** | `deploy/compose/docker-compose.dev.yml` | `.env.dev` | Bridge network with Gateway (`4000`), Client (`80`), RabbitMQ UI (`15672`), and Postgres (`127.0.0.1:5433`) | Containerized staging parity, automated migrations & seed data |
| **Production** | `deploy/compose/docker-compose.prod.yml` | `.env.prod` | Dual network (`public` & isolated `internal: true`) | Zero external DB/broker ports, log rotation, `restart: always`, strict secrets |

---

### 1. Local Development (`local`)

1. Copy the local environment file:
   ```bash
   cp .env.local.example .env.local
   # Or use .env
   ```

2. Start the local containers:
   ```bash
   docker compose -f deploy/compose/docker-compose.local.yml up -d --build
   ```

3. Run the frontend client locally (optional if running client outside Docker):
   ```bash
   cd client
   npm install
   npm run dev
   ```
   The client runs at `http://localhost:5173` pointing to API Gateway at `http://localhost:4000`.

---

### 2. Development & Staging (`dev`)

1. Copy and configure the dev environment file:
   ```bash
   cp .env.dev.example .env.dev
   ```

2. Start the dev stack:
   ```bash
   docker compose -f deploy/compose/docker-compose.dev.yml --env-file .env.dev up -d --build
   ```

3. Access endpoints:
   - **Client Application**: `http://localhost:80`
   - **API Gateway**: `http://localhost:4000`
   - **RabbitMQ Management Console**: `http://localhost:15672` (User: `orderfirst_dev`, Pass: `orderfirst_dev_pass`)
   - **PostgreSQL**: `127.0.0.1:5433` (DB: `orderfirst_dev`)

---

### 3. Production (`prod`)

1. Copy and configure the production environment file:
   ```bash
   cp .env.prod.example .env.prod
   ```
   > [!IMPORTANT]
   > Ensure all placeholders in `.env.prod` (e.g. `POSTGRES_PASSWORD`, `JWT_SECRET`, `INTERNAL_SECRET`, `RABBITMQ_DEFAULT_PASS`, `EMAIL_APP_PASSWORD`) are replaced with cryptographically secure values before starting the production stack.

2. Start the production stack:
   ```bash
   docker compose -f deploy/compose/docker-compose.prod.yml --env-file .env.prod up -d --build
   ```

3. Verification:
   ```bash
   curl -f http://localhost:4000/health
   curl -f http://localhost:80/healthz
   ```

---

## Running Tests

Each service has its own independent test suite and TypeScript validation:

```bash
# Typecheck all services and build client
npm run typecheck --prefix services/auth
npm run typecheck --prefix services/catalog
npm run typecheck --prefix services/booking
npm run typecheck --prefix services/orders
npm run typecheck --prefix services/notify
npm run typecheck --prefix services/gateway
npm run build --prefix client

# Run unit tests across services
for svc in auth catalog booking orders notify gateway; do
  echo "Testing $svc..."
  (cd services/$svc && npm test)
done
```

---

## CI/CD Pipeline (Jenkins)

OrderFirst includes a centralized, monorepo-aware CI/CD pipeline located in [`deploy/jenkins/`](file:///Users/hi-shanto/Documents/orderfirst/deploy/jenkins).

### Key Pipeline Features

1. **Selective Change Detection**: Evaluates `git diff` via [`deploy/jenkins/scripts/detect-changes.sh`](file:///Users/hi-shanto/Documents/orderfirst/deploy/jenkins/scripts/detect-changes.sh). Only microservices with modified files in the commit range are tested, built, and deployed.
2. **Fail-Safe Quality Gate**: If unit tests, typechecks, or Docker image builds fail for any service, the pipeline halts immediately. **Live containers on the server are never touched or interrupted.**
3. **Zero-Downtime Rolling Updates**: Deploys using `docker compose up -d --no-deps <changed-services>`. Untouched services, PostgreSQL, and RabbitMQ remain online without dropping active user connections.
4. **Environment Branch Mapping**: Automatically routes `main`/`master` pushes to `prod` (`deploy/compose/docker-compose.prod.yml`) and other branches to `dev` (`deploy/compose/docker-compose.dev.yml`).

### Setting Up the Jenkins Job

1. In Jenkins, create a **New Item** &rarr; select **Pipeline** (or **Multibranch Pipeline**).
2. Under **Pipeline Definition**, select **Pipeline script from SCM**.
3. Set SCM to **Git** and enter this repository URL and credentials.
4. Set **Script Path** to:
   ```
   deploy/jenkins/Jenkinsfile
   ```
5. *(Optional for remote image pushing)* Add Jenkins Credential:
   - **ID**: `docker-registry-credentials`
   - **Type**: Username with password (or secret token) for your container registry.
6. Run the build or push a commit. The pipeline automatically detects changed services, tests them in parallel, builds images, and triggers safe rolling updates.

---

## Multi-Platform Docker Builds (macOS & Linux / Ubuntu)

OrderFirst is fully configured to support multi-architecture builds. You can develop and test natively on **macOS (Apple Silicon ARM64 / Intel)** and build images that deploy seamlessly onto **Linux (Ubuntu x86_64 / ARM64)** without `exec format error`.

### 1. Build Multi-Platform Images via CLI

Use the dedicated build script [`deploy/scripts/build-images.sh`](file:///Users/hi-shanto/Documents/orderfirst/deploy/scripts/build-images.sh):

```bash
# Build multi-arch images (both macOS and Linux Ubuntu) and push to registry:
./deploy/scripts/build-images.sh --platform linux/amd64,linux/arm64 --push

# Build specifically for Ubuntu Linux deployment:
./deploy/scripts/build-images.sh --platform linux/amd64

# Build natively for local macOS testing (fast, no emulation):
./deploy/scripts/build-images.sh --platform local

# Build a single service (e.g. auth):
./deploy/scripts/build-images.sh --platform linux/amd64 auth
```

### 2. Multi-Platform in Jenkins

The Jenkins pipeline ([`deploy/jenkins/Jenkinsfile`](file:///Users/hi-shanto/Documents/orderfirst/deploy/jenkins/Jenkinsfile)) includes a configurable parameter `DOCKER_PLATFORMS`:
- **Default value**: `linux/amd64,linux/arm64`
- Builds and packages dual-architecture container manifests automatically so the same image tag works natively across both local Mac developer environments and remote Ubuntu cloud instances.
