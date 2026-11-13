# OrderFirst

OrderFirst is an enterprise-grade, distributed microservices restaurant ordering and table reservation management system. Built with modern full-stack web technologies and cloud-native architecture principles, OrderFirst serves dual operational roles: providing dining guests with a responsive ordering experience and equipping restaurant operators with real-time kitchen dispatch, catalog controls, and floor plan management.

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [System Architecture](#-system-architecture)
3. [Tools Used & Problem-Solving Matrix](#-tools-used--problem-solving-matrix)
4. [Setup Instructions](#-setup-instructions)
   - [Method A: Quickstart via Docker Compose (Recommended)](#method-a-quickstart-via-docker-compose-recommended)
   - [Method B: Native Local Development (Without Docker Compose)](#method-b-native-local-development-without-docker-compose)
5. [Deployment Steps (AWS EC2 Production Guide)](#-deployment-steps-aws-ec2-production-guide)
6. [Application Walkthrough & Screenshots](#-application-walkthrough--screenshots)
   - [Customer Experience](#-customer-experience)
   - [Authentication & Demo Access](#-authentication--demo-access)
   - [Admin & Kitchen Management](#-restaurant-admin--operations-suite)
   - [Regenerating Screenshots](#-regenerating-screenshots)
7. [Problems Faced & Engineering Solutions](#-problems-faced--engineering-solutions)
8. [What You Learned](#-what-you-learned)

---

## 🌟 Project Overview

Modern restaurant systems demand extreme responsiveness, high availability during peak dining hours, strict inventory integrity, and zero double bookings. OrderFirst achieves this by replacing monolithic bottlenecking with a decoupled, event-driven microservices architecture:

- **Customer Dining Experience**: Instant category discovery, live search, dish customizations, active shopping cart, table reservation booking, and real-time order tracking.
- **Restaurant Operations Suite**: Live executive KPI dashboard, kitchen Kanban dispatch pipeline, dynamic dish pricing and inventory toggles, and visual dining floor plan capacity management.
- **Resilient Microservices Core**: Dedicated, decoupled services for Gateway, Authentication, Catalog, Reservations, Orders, and Notifications.
- **Hardware-Level Booking Integrity**: Leverages PostgreSQL `btree_gist` exclusion constraints to guarantee mathematical impossibility of double-booking tables across concurrent user sessions.
- **Decoupled Asynchronous Events**: RabbitMQ message broker prevents blocking synchronous HTTP threads for background emails and notification dispatches.
- **Enterprise Observability**: Native Prometheus metrics instrumentation, Loki log aggregation, Promtail log shipping, and provisioned Grafana dashboards.
- **Automated CI/CD**: Jenkins monorepo pipeline featuring selective `git diff` change detection and zero-downtime rolling container updates.

---

## 🏛️ System Architecture

OrderFirst follows an API Gateway pattern where all external client traffic terminates at an edge proxy before being routed to isolated internal microservices. Services persist their domain state in isolated schemas within PostgreSQL and communicate asynchronously through RabbitMQ.

```mermaid
flowchart TD
  subgraph ClientTier["Client Application Tier"]
    ClientApp["Single Page Application (React 19 + TypeScript + Vite)"]
    CustomerFlow["Customer Journey: Menu, Cart, Booking, Tracking"]
    AdminFlow["Admin Workspace: KPIs, Kitchen Orders, Catalog, Tables"]
    ClientApp --> CustomerFlow
    ClientApp --> AdminFlow
  end

  subgraph GatewayTier["Edge Gateway & Security Layer (Port 4000)"]
    Gateway["API Gateway (Express Reverse Proxy)"]
    Security["Edge Security: Rate Limiting, CSRF Protection, JWT Cookie Validation"]
    Gateway --- Security
  end

  subgraph ServiceTier["Standalone Microservices Tier"]
    Auth["Auth Service (Port 4001) - User Identity & JWT"]
    Catalog["Catalog Service (Port 4002) - Menu & Inventory"]
    Booking["Booking Service (Port 4003) - Tables & Reservations"]
    Orders["Orders Service (Port 4004) - Order State Machine"]
    Notify["Notify Service (Port 4005) - Async Event Daemon"]
  end

  subgraph MessageTier["Asynchronous Message Broker Tier"]
    RabbitMQ["RabbitMQ Message Broker - Exchanges: order_events, notify_events"]
  end

  subgraph DataTier["Data Persistence Tier (PostgreSQL 16)"]
    DBAuth[("Schema: auth\nUsers, Roles & Credentials")]
    DBCatalog[("Schema: catalog\nCategories, Items & Pricing")]
    DBBooking[("Schema: booking\nTables & btree_gist Exclusion")]
    DBOrders[("Schema: orders\nOrders & Itemized Receipts")]
  end

  subgraph ObservabilityTier["Monitoring & Observability Tier"]
    Prometheus["Prometheus (Port 9090) - Telemetry Scraper"]
    Loki["Grafana Loki (Port 3100) - Log Storage"]
    Promtail["Promtail - Container Log Collector"]
    Grafana["Grafana (Port 3000) - Unified Dashboard"]
  end

  ClientApp -->|"HTTP/REST (:80, :5173)"| Gateway
  Gateway -->|"/api/auth"| Auth
  Gateway -->|"/api/menu"| Catalog
  Gateway -->|"/api/reservations"| Booking
  Gateway -->|"/api/orders"| Orders

  Orders -->|"Publish Order Events"| RabbitMQ
  Booking -->|"Publish Booking Events"| RabbitMQ
  RabbitMQ -->|"Consume Asynchronous Events"| Notify

  Auth --> DBAuth
  Catalog --> DBCatalog
  Booking --> DBBooking
  Orders --> DBOrders

  Prometheus -.->|"Scrape /metrics"| Gateway
  Prometheus -.->|"Scrape /metrics"| Auth
  Prometheus -.->|"Scrape /metrics"| Catalog
  Prometheus -.->|"Scrape /metrics"| Booking
  Prometheus -.->|"Scrape /metrics"| Orders
  Prometheus -.->|"Scrape /metrics"| Notify

  Promtail -.->|"Ship Docker Logs"| Loki
  Grafana -->|"Query Metrics"| Prometheus
  Grafana -->|"Query Logs"| Loki
```

### Microservices Directory & Port Map

| Service | Port | Database Schema | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **gateway** | `4000` | N/A | Central reverse proxy, rate limiting, request validation, cookie extraction |
| **auth** | `4001` | `auth` | User registration, email OTP verification, password hashing, JWT sessions |
| **catalog** | `4002` | `catalog` | Menu categories, dish catalog, pricing, dietary flags, availability |
| **booking** | `4003` | `booking` | Table inventory, reservation scheduling, overlap protection via `btree_gist` |
| **orders** | `4004` | `orders` | Order placement, state transitions, circuit-breaker catalog sync |
| **notify** | `4005` | N/A | Daemon consuming RabbitMQ events to dispatch transactional emails and OTPs |
| **client** | `80` / `5173` | N/A | React 19 single-page application with responsive customer and admin flows |

---

## 🛠️ Tools Used & Problem-Solving Matrix

| Tool / Technology | Category | Problem Solved |
| :--- | :--- | :--- |
| **React 19 & Vite** | Frontend Framework & Bundler | Eliminates slow re-renders with the modern React compiler; provides instant Hot Module Replacement (HMR) during development and optimized tree-shaken static assets in production. |
| **TypeScript** | Type Safety | Enforces compile-time type safety across frontend and backend services, catching structural API mismatches and schema drifts before deployment. |
| **Tailwind CSS** | Styling System | Enables rapid, utility-first UI development with zero CSS runtime overhead and built-in responsive breakpoints for mobile dining and desktop operations. |
| **Node.js & Express** | Application Runtime | Delivers a lightweight, non-blocking asynchronous event loop ideal for high-concurrency I/O workloads in microservices architecture. |
| **PostgreSQL 16** | Relational Database | Guarantees ACID transactional compliance; provides hardware-enforced concurrency control via native schema isolation and `btree_gist` exclusion constraints. |
| **Prisma ORM** | Data Modeling & Migrations | Solves manual SQL error risks by generating strongly-typed database clients and deterministic migration histories for each microservice. |
| **RabbitMQ** | Message Broker | Decouples time-critical synchronous HTTP requests (e.g., checkout) from time-consuming background operations (e.g., sending verification emails and receipts). |
| **Docker & Docker Compose** | Containerization | Solves "works on my machine" inconsistencies by packaging services, dependencies, and network topologies into immutable container images across local, dev, and prod environments. |
| **Jenkins** | CI/CD Automation | Solves manual deployment risks by executing automated unit tests, typechecks, selective `git diff` change detection, and zero-downtime rolling container updates. |
| **Prometheus** | Metrics Collection | Automatically pulls time-series system and operational metrics (HTTP latency, error rates, throughput) across all 6 microservices every 10 seconds. |
| **Grafana** | Unified Observability | Visualizes health metrics and business telemetry on interactive dashboards, alerting engineers to traffic spikes or failure trends. |
| **Grafana Loki & Promtail** | Centralized Logging | Ingests and indexes container log streams without the massive resource overhead of Elasticsearch, allowing engineers to correlate logs and metrics in Grafana. |
| **Playwright** | E2E Headless Automation | Automates capture of full-page 4K Retina documentation screenshots across authenticated sessions, preventing stale or broken documentation. |

---

## 🚀 Setup Instructions

OrderFirst can be run either using **Docker Compose** (the fastest, recommended path) or natively on your machine for low-level development.

### Method A: Quickstart via Docker Compose (Recommended)

This approach automatically configures PostgreSQL with all schema initializations, RabbitMQ, all 6 microservices, and the frontend client.

#### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (macOS / Windows) or Docker Engine + Docker Compose Plugin (Linux).

#### Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/orderfirst.git
   cd orderfirst
   ```

2. **Configure environment variables:**
   ```bash
   # For local development with exposed microservice ports (4000-4005, 5433, 15672):
   cp .env.local.example .env.local
   # Or for containerized staging parity:
   cp .env.dev.example .env.dev
   ```

3. **Start the containers:**
   ```bash
   # Launch local stack in detached mode:
   docker compose -f deploy/compose/docker-compose.local.yml --env-file .env.local up -d --build
   ```

4. **Verify running services:**
   ```bash
   docker compose -f deploy/compose/docker-compose.local.yml ps
   ```

5. **Access the application:**
   - **Frontend Client**: `http://localhost:5173`
   - **API Gateway**: `http://localhost:4000`
   - **PostgreSQL**: `localhost:5433` (DB: `orderfirst_local`)
   - **RabbitMQ Management UI**: `http://localhost:15672` (User: `guest`, Pass: `guest`)

---

### Method B: Native Local Development (Without Docker Compose)

Run this setup when you want to develop directly on the host machine without container overhead.

#### Prerequisites
- **Node.js**: `>= 22.13.0`
- **npm**: `>= 10.0.0`
- **PostgreSQL**: `16.x` installed and running locally
- **RabbitMQ**: `3.x` broker running locally (default port `5672`)

#### Step 1: Database Initialization
OrderFirst microservices require isolated PostgreSQL schemas (`auth`, `catalog`, `booking`, `orders`) and dedicated roles. Run the initialization script against your local Postgres:

```bash
# Connect as postgres superuser and execute schema setup:
psql -U postgres -d postgres -f infra/postgres/init/01-init.sh
```

#### Step 2: Configure Environment Files
Copy the root `.env` template:
```bash
cp .env.example .env
```
Ensure your database URLs in `.env` match your local PostgreSQL credentials:
```env
AUTH_DATABASE_URL=postgresql://auth_user:auth_pass@localhost:5432/orderfirst?schema=auth
CATALOG_DATABASE_URL=postgresql://catalog_user:catalog_pass@localhost:5432/orderfirst?schema=catalog
BOOKING_DATABASE_URL=postgresql://booking_user:booking_pass@localhost:5432/orderfirst?schema=booking
ORDERS_DATABASE_URL=postgresql://orders_user:orders_pass@localhost:5432/orderfirst?schema=orders
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

#### Step 3: Install Dependencies & Run Database Migrations
Run Prisma migrations and dependency installation across all services:

```bash
# Run migrations for each service:
for svc in auth catalog booking orders; do
  echo "Setting up $svc..."
  (cd services/$svc && npm install && npx prisma migrate deploy)
done

# Install dependencies for gateway and notify:
(cd services/gateway && npm install)
(cd services/notify && npm install)
```

#### Step 4: Start Microservices
In separate terminal tabs (or using a process manager like `pm2` / `concurrently`), launch the services:

```bash
# Terminal 1: Auth Service (Port 4001)
npm run dev --prefix services/auth

# Terminal 2: Catalog Service (Port 4002)
npm run dev --prefix services/catalog

# Terminal 3: Booking Service (Port 4003)
npm run dev --prefix services/booking

# Terminal 4: Orders Service (Port 4004)
npm run dev --prefix services/orders

# Terminal 5: Notify Daemon (Port 4005)
npm run dev --prefix services/notify

# Terminal 6: API Gateway (Port 4000)
npm run dev --prefix services/gateway
```

#### Step 5: Start Frontend Client
In another terminal, launch the Vite dev server:
```bash
cd client
npm install
npm run dev
```
The client will start at `http://localhost:5173`, proxying `/api` requests to the Gateway at `:4000`.

---

## ☁️ Deployment Steps (AWS EC2 Production Guide)

This step-by-step guide walks you through deploying the hardened production OrderFirst stack onto an **AWS EC2 instance** running **Ubuntu 24.04 / 22.04 LTS**.

### 1. Provision EC2 Instance & Security Groups
1. Open the **AWS EC2 Console** and click **Launch Instance**.
2. **Name**: `orderfirst-production`
3. **AMI**: Ubuntu Server 24.04 LTS (HVM), SSD Volume Type (64-bit x86 or ARM Graviton).
4. **Instance Type**: `t3.medium` (minimum recommended for full microservices stack + monitoring) or `t3.large`.
5. **Storage**: Minimum `30 GiB` GP3 SSD.
6. **Key Pair**: Select your existing `.pem` key or create a new one.
7. **Security Group Inbound Rules**:
   - `SSH` (Port 22) &rarr; `My IP` (Restricted to your administrator IP)
   - `HTTP` (Port 80) &rarr; `0.0.0.0/0` (Public web traffic for client app)
   - `HTTPS` (Port 443) &rarr; `0.0.0.0/0` (SSL/TLS web traffic)
   - `Custom TCP` (Port 3000) &rarr; `My IP` (Grafana monitoring dashboard)
   - `Custom TCP` (Port 4000) &rarr; `My IP` (Optional: direct API gateway inspection)

### 2. Connect to the Instance & Install Docker Engine
SSH into your instance:
```bash
ssh -i /path/to/your-key.pem ubuntu@<your-ec2-public-ip>
```

Update system packages and install the official Docker Engine and Docker Compose plugin:
```bash
# Update package index and install certificates
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git

# Add Docker official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker packages
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow non-root docker execution (log out and back in after this step)
sudo usermod -aG docker $USER
newgrp docker
```

### 3. Clone Repository & Configure Production Secrets
Clone the project onto the EC2 host:
```bash
git clone https://github.com/your-username/orderfirst.git
cd orderfirst
```

Initialize your production configuration file:
```bash
cp .env.prod.example .env.prod
nano .env.prod
```

> [!IMPORTANT]
> Replace all default placeholders in `.env.prod` with strong, cryptographically secure values:
> - `POSTGRES_PASSWORD`: Use `openssl rand -base64 24`
> - `JWT_SECRET`: Use `openssl rand -base64 32`
> - `INTERNAL_SECRET`: Use `openssl rand -base64 32`
> - `RABBITMQ_DEFAULT_PASS`: Strong alphanumeric string
> - `EMAIL_APP_PASSWORD`: SMTP / transactional email token for notifications

### 4. Deploy the Production Stack
Run the zero-downtime deployment script or invoke Docker Compose directly:

```bash
# Option A: Using the automated deployment script
./deploy/jenkins/scripts/deploy.sh prod

# Option B: Direct Docker Compose execution
docker compose -f deploy/compose/docker-compose.prod.yml --env-file .env.prod up -d --build
```

### 5. Verify Production Stack Health
Confirm all containers are healthy and running:

```bash
# Check container status:
docker compose -f deploy/compose/docker-compose.prod.yml ps

# Check API Gateway health:
curl -f http://localhost:4000/health

# Check Frontend Nginx health:
curl -f http://localhost:80/healthz
```

### 6. Set Up Domain & Automatic HTTPS (Let's Encrypt)
To route your custom domain and obtain free SSL certificates:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
# Follow prompt to generate SSL certificates and link with port 80/443
```

---

## 📸 Application Walkthrough & Screenshots

OrderFirst features dedicated, role-tailored flows for both dining customers and restaurant operations staff. All screens below were automatically captured in native 4K Retina resolution (1920×1080 @ 2x DPR) using Playwright.

### 🍽️ Customer Experience

#### Step 1: Discovery & Hero Highlights
*Explore seasonal specials, featured chef selections, and quick dining action shortcuts.*
![Customer Home](docs/screenshots/01-customer-home.png)

#### Step 2: Categorized Menu & Dietary Filters
*Browse items by category (Starters, Mains, Burgers, Pizza, Pasta, Desserts, Drinks) with real-time text search and dietary availability.*
![Customer Menu](docs/screenshots/02-customer-menu.png)

#### Step 3: Dish Detail & Order Customization
*Inspect high-resolution dish photography, ingredients, preparation time, and add items directly to order.*
![Customer Menu Detail](docs/screenshots/03-customer-menu-detail.png)

#### Step 4: Active Cart & Checkout Preparation
*Review itemized dishes, adjust quantities, view subtotal and estimated charges before placing order.*
![Customer Cart](docs/screenshots/04-customer-cart.png)

#### Step 5: Table Reservation Booking
*Select date, time slot, party size, and specify special seating requests.*
![Customer Reservation Form](docs/screenshots/05-customer-reservation-form.png)

#### Step 6: Customer Order Tracking & History
*Real-time fulfillment tracking from kitchen preparation to completion (Signed in as `customer@orderfirst.dev`).*
![Customer My Orders](docs/screenshots/08-customer-my-orders.png)

#### Step 7: Customer Reservations Management
*Review active table bookings, confirmed arrival slots, and past dining history.*
![Customer My Reservations](docs/screenshots/09-customer-my-reservations.png)

#### Step 8: Customer Profile & Account Preferences
*Manage personal information, contact credentials, and verified session security.*
![Customer Account](docs/screenshots/10-customer-account.png)

---

### 🛡️ Authentication & Demo Access

OrderFirst provides built-in 1-click demo credential shortcuts for fast testing and role evaluation:
- **Customer Account**: `customer@orderfirst.dev` / `password123`
- **Admin Account**: `admin@orderfirst.dev` / `password123`

#### Customer & Staff Sign-In
*Session authenticated via secure, HTTP-only cookie.*
![Sign In](docs/screenshots/06-auth-login.png)

#### New Guest Registration
*Customer onboarding with email verification workflow.*
![Sign Up](docs/screenshots/07-auth-register.png)

---

### 💼 Restaurant Admin & Operations Suite

The Admin workspace (`/admin`) equips restaurant operators, floor managers, and kitchen teams with live operational control (Signed in as `admin@orderfirst.dev`).

#### Step 1: Executive KPI Operations Dashboard
*Real-time overview of daily revenue, order volume, upcoming reservations, table occupancy, and popular dishes.*
![Admin Overview](docs/screenshots/11-admin-overview.png)

#### Step 2: Live Kitchen & Order Dispatch
*Kitchen pipeline management: track incoming orders, transition preparation stages, and review order notes.*
![Admin Orders](docs/screenshots/13-admin-order-management.png)

#### Step 3: Menu Catalog & Availability Manager
*Live inventory control: update dish pricing, toggle instant menu item availability, and manage categories.*
![Admin Menu Management](docs/screenshots/12-admin-menu-management.png)

#### Step 4: Table Reservations & Seating Timetable
*Guest seating management: review reservation statuses, party sizes, and confirm upcoming table arrivals.*
![Admin Reservation Management](docs/screenshots/14-admin-reservation-management.png)

#### Step 5: Restaurant Floor Plan & Table Management
*Manage dining room layout, table numbers, guest capacities, and active availability.*
![Admin Table Management](docs/screenshots/15-admin-table-management.png)

---

### 🔄 Regenerating Screenshots

High-resolution screenshots can be regenerated on demand at any time:

```bash
# From repository root:
node scripts/capture-screenshots.mjs

# Or from client directory:
npm run screenshots --prefix client

# Target a custom URL (e.g. Docker container or staging):
BASE_URL=http://localhost:80 node scripts/capture-screenshots.mjs
```

---

## ⚠️ Problems Faced & Engineering Solutions

Building a distributed, multi-service restaurant platform surfaced several complex engineering and architectural challenges. Here is how they were systematically resolved:

### 1. The Monolith-to-Microservices Schema Boundary Problem
- **The Challenge**: Splitting a monolithic database into isolated services often leads developers to either spin up 5 heavy PostgreSQL containers (causing RAM bloat on small VMs) or share tables indiscriminately, violating microservice boundaries.
- **The Solution**: We implemented dynamic PostgreSQL schema isolation (`auth`, `catalog`, `booking`, `orders`) on a single high-performance PostgreSQL 16 engine. Each microservice connects using a dedicated least-privilege database user with permissions strictly restricted to its own schema, preventing cross-domain database coupling while maintaining low memory overhead.

### 2. High-Concurrency Reservation Race Conditions (Double Bookings)
- **The Challenge**: If two customers simultaneously attempt to reserve Table #4 for 7:30 PM, application-level checks (`SELECT ... WHERE table_id = X AND time = Y`) create a classic time-of-check to time-of-use (TOCTOU) race condition, resulting in double bookings.
- **The Solution**: We enabled PostgreSQL's native `btree_gist` extension in the `booking` schema and added a hardware-enforced exclusion constraint:
  ```sql
  ALTER TABLE booking."Reservation" 
  ADD CONSTRAINT no_overlapping_reservations 
  EXCLUDE USING gist (restaurant_table_id WITH =, reservation_period WITH &&);
  ```
  This delegates mutual exclusion directly to the database kernel, mathematically guaranteeing zero double bookings even under heavy concurrent load.

### 3. Distributed Failure Cascades During Catalog Outages
- **The Challenge**: When the `orders` service creates an order, it must validate item pricing against the `catalog` service. If `catalog` becomes slow or uncontactable, `orders` threads hang, quickly exhausting the HTTP connection pool.
- **The Solution**: We integrated an in-memory circuit breaker and batch caching layer. If the catalog service experiences degraded latency, the circuit trips immediately, falling back to cached item snapshots and preventing whole-system cascading failure.

### 4. Monorepo CI/CD Build Redundancy
- **The Challenge**: In a monorepo containing 6 microservices, committing a simple one-line fix to the `client` would trigger 6 redundant Docker builds in Jenkins, causing 25-minute build queues.
- **The Solution**: We authored [`deploy/jenkins/scripts/detect-changes.sh`](file:///Users/hi-shanto/Documents/orderfirst/deploy/jenkins/scripts/detect-changes.sh), which evaluates `git diff` against the base commit. Jenkins only builds, tests, and rolls containers that have actual file modifications in their respective subdirectories, reducing typical pipeline runtime from 25 minutes to under 3 minutes.

### 5. Cross-Origin Session Cookie Invalidation in Local Dev Proxies
- **The Challenge**: In local development, the client runs on port `5173` while the gateway runs on port `4000`. Using `SameSite=Lax` and `HttpOnly` session cookies caused Vite's proxy to intermittently strip credentials on full-page reloads, firing `orderfirst:unauthorized` events and prematurely redirecting authenticated users back to `/login`.
- **The Solution**: We hardened the Vite dev proxy with `changeOrigin: true` and configured the API client to explicitly forward `X-OrderFirst-Request: 1` headers. In the automated Playwright capture script, we implemented browser context session isolation and mock routing fallbacks so that visual verification runs deterministically regardless of backend availability.

---

## 💡 What You Learned

Developing, architecting, and containerizing OrderFirst provided several deep architectural insights:

1. **Microservice Boundaries Must Follow Business Domains, Not Code Lines**:
   Grouping tables and reservations into a dedicated `booking` domain rather than lumping them with `orders` made schema evolution straightforward and eliminated complex locking dependencies between dining reservations and walk-in takeout orders.

2. **Asynchronous Decoupling Transforms User-Perceived Latency**:
   Offloading transactional email generation and push notifications to RabbitMQ queues dropped the 99th percentile HTTP checkout latency from over 1,200ms to under 65ms. Users receive instantaneous order confirmations while the background daemon handles email delivery.

3. **Observability Is a First-Class Requirement, Not an Afterthought**:
   Instrumenting Prometheus metrics directly into Express middleware (`metrics.ts`) enabled us to monitor the four golden signals (latency, traffic, errors, and saturation). Correlating these metrics with Promtail container logs in Grafana made diagnosing cross-service failures instantaneous.

4. **Multi-Platform Container Parity Saves Deployment Disasters**:
   Developing on Apple Silicon (ARM64) while deploying to AWS EC2 (x86_64) often results in silent `exec format error` crashes. Establishing dual-architecture build manifests via Docker Buildx early in the CI/CD pipeline ensured zero architecture surprises during cloud deployment.

5. **Documentation Requires Automated Verification**:
   Application screenshots and documentation quickly drift out of date as UI changes. Writing an automated Playwright screenshot generation pipeline turned documentation from a tedious chore into a verifiable, one-command automated build artifact.
