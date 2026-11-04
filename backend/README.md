# [ARCHIVED MONOLITH] OrderFirst API

> [!NOTE]
> This monolith API has been decomposed into 6 standalone microservices under `services/` (`gateway`, `auth`, `catalog`, `booking`, `orders`, `notify`) orchestrated by `infra/docker-compose.yml`. This documentation is preserved for historical and reference purposes.

A standalone Node.js / Express / TypeScript backend for one restaurant. PostgreSQL and Prisma store users, menu categories and dishes, order history, tables, and reservations. The `../frontend` consumes this API through TanStack Query and cookie-based authentication.

## Requirements and installation

- Node.js 22.13+ and npm
- PostgreSQL 16+ recommended (tested with PostgreSQL 16)
- A database owner able to install the `btree_gist` extension, or have an administrator provision it

```bash
cd backend
npm ci
cp .env.example .env
# Edit DATABASE_URL and JWT_SECRET before continuing.
# Generate a secret with: openssl rand -hex 32
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
npm run dev
```

The API listens at `http://localhost:4000`. It binds to `0.0.0.0` for containers. Startup checks the database connection before accepting requests. No database mutation runs automatically on server startup.

To provision a local database using an existing PostgreSQL installation:

```bash
createuser --pwprompt orderfirst
createdb --owner=orderfirst orderfirst
```

Supply the database administrator connection options appropriate to your installation. Set the resulting credentials in `DATABASE_URL`; the password in `.env.example` is only an example.

## Configuration

All runtime environment access is centralized in `src/config/env.ts`. Missing or invalid required variables stop startup with the affected field names, without printing secret values.

| Variable | Meaning |
| --- | --- |
| `NODE_ENV` | `development`, `test`, or `production` |
| `PORT` | HTTP port, default `4000` |
| `DATABASE_URL` | PostgreSQL URL; add `connect_timeout=5&pool_timeout=5` if appropriate for your deployment |
| `JWT_SECRET` | Required random secret of at least 32 characters |
| `JWT_EXPIRES_IN` | Token lifetime **in seconds**, default `86400`; allowed `60`–`604800` |
| `FRONTEND_URL` | One exact frontend origin; no paths, credentials, or wildcard. Production requires HTTPS. |
| `LOG_LEVEL` | Pino level, default `info` |
| `TRUST_PROXY_HOPS` | Trusted reverse-proxy hops, default `0`; set only to match the actual deployment |
| `EMAIL_USER` | Gmail address used to send verification emails |
| `EMAIL_APP_PASSWORD` | Gmail app password for `EMAIL_USER` (spaces are stripped automatically) |
| `TEST_DATABASE_URL` | Integration tests only; must point to a separate database whose name ends in `_test` |

Do not commit `.env`. Secrets are provided by the environment or a deployment secret manager.

## Architecture

```text
src/
  config/             validated environment, Prisma client, Pino
  modules/
    auth/             registration, login, logout, JWT cookies
    users/            safe user reads and public field selection
    menu/             public browsing and admin category/dish changes
    orders/           exact totals, price snapshots, ownership, transitions
    reservations/     availability, conflict prevention, cancellation
    tables/           table capacity and availability management
    dashboard/        bounded operational summary queries
  middlewares/        typed request validation, authentication, roles, CSRF, errors
  errors/             AppError
  utils/              response formatting, pagination, transaction retries
  types/              safe authenticated Express request context
  app.ts              middleware and routes; no listener
  server.ts           startup, HTTP listener, shutdown
prisma/
  schema.prisma
  migrations/         initial tables, constraints, indexes, overlap protection
  seed.ts             non-destructive, repeatable development fixtures
tests/                validation/unit tests and real PostgreSQL HTTP tests
```

Routes attach `validateRequest(schema, controller)`. This middleware passes the **parsed Zod output** to the typed controller, avoiding casts or mutation of Express 5's query getter. Controllers only coordinate services and responses. Services query Prisma directly; no repository or generic filtering layer.

Prisma 6.19 is deliberately pinned to keep the classic schema/client setup consistent. Two Prisma CLI transitive dependencies (`effect` and `deepmerge-ts`) are overridden to patched versions; client generation and migrations are verified with those versions. Prisma's [transaction documentation](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions) describes the serializable isolation and `P2034` retry behavior used here.

## Authentication, roles, and CSRF

| Development role | Email | Password |
| --- | --- | --- |
| Customer | `customer@orderfirst.dev` | `password123` |
| Admin | `admin@orderfirst.dev` | `password123` |

Seeding is refused with `NODE_ENV=production`. It never resets existing account passwords or existing menu records. Create production admin accounts through a controlled provisioning process, not public registration. Registration always creates a `CUSTOMER`; attempts to submit `role` are rejected.

Passwords use bcrypt cost 12; the API enforces its 72-byte UTF-8 limit. Login and registration set the `orderfirst_session` JWT cookie with `HttpOnly`, `SameSite=Lax`, expiration, and `Secure` in production. Tokens use HS256 with explicit issuer, audience, and expiry. Authentication reads the current user's role and verification status from PostgreSQL, so role changes, email verification, and deleted accounts take effect immediately. No password hash is exposed in responses or attached to requests.

Registration creates an unverified account, sends a 6-digit verification code by email, and logs the user in. The user must call `POST /api/auth/verify-email` with the code before placing orders, making reservations, or using admin routes. Unverified users may still call `GET /api/auth/me`, `POST /api/auth/verify-email`, `POST /api/auth/resend-verification`, and `POST /api/auth/logout`. Codes expire after 10 minutes; resend is limited to once per 60 seconds per account.

Logout expires the browser cookie. This intentionally simple JWT implementation has no session blacklist: an independently copied token remains valid until expiration. Set an appropriate short lifetime for your deployment; real-time token revocation would require a separate session design.

**Every POST, PATCH, and DELETE requires `X-OrderFirst-Request: 1`**, including login/register/logout. If an `Origin` header is present, it must exactly match `FRONTEND_URL`. CORS permits credentials only for that origin. The custom header forces browser preflight, blocking cross-origin form submissions and login CSRF without a separate CSRF-token subsystem. SameSite cookies add another layer. Non-browser clients also send this header. Do not replace the CORS origin with `*`.

The frontend and API should share a site in production (for example `app.example.com` and `api.example.com`) because cookies use `SameSite=Lax`. Cross-site hosting needs an explicit cookie/CSRF review. XSS on an allowed origin can still send authenticated requests; HTTP-only cookies do not prevent that.

```ts
await fetch('http://localhost:4000/api/auth/login', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json', 'X-OrderFirst-Request': '1' },
  body: JSON.stringify({ email: 'customer@orderfirst.dev', password: 'password123' }),
});
```

Authentication endpoints allow 20 attempts per 15 minutes per IP in production and 100 in development/test. Rate limiting uses an in-memory store suitable for one API process; horizontally scaled deployments need a shared limiter or equivalent edge protection.

## API routes

All resource IDs are UUIDs. `page` starts at 1; `limit` defaults to 20 and cannot exceed 100. Unknown body fields are rejected on writes. Boolean query filters accept exactly `true` or `false`.

| Method | Route | Permission / input |
| --- | --- | --- |
| POST | `/api/auth/register` | Public: `name`, `email`, `password`; sends verification email |
| POST | `/api/auth/login` | Public: `email`, `password` |
| POST | `/api/auth/verify-email` | Authenticated: `code` (6 digits) |
| POST | `/api/auth/resend-verification` | Authenticated; sends a new code (60s cooldown) |
| POST | `/api/auth/logout` | Clears cookie; idempotent |
| GET | `/api/auth/me` | Authenticated (works before email verification) |
| GET | `/api/menu/categories` | Public; `page`, `limit` |
| GET | `/api/menu/items` | Public; `search`, `category` (UUID or slug), `featured`, `available`, `page`, `limit` |
| GET | `/api/menu/items/:menuItemId` | Public |
| POST | `/api/orders` | Customer: `orderType`, `items`, optional `notes` |
| GET | `/api/orders` | Customer's own; `status`, `page`, `limit` |
| GET | `/api/orders/:orderId` | Customer's own |
| GET | `/api/admin/orders` | Admin; `status`, `search` (customer name or exact order UUID), `page`, `limit` |
| GET | `/api/admin/orders/:orderId` | Admin |
| PATCH | `/api/admin/orders/:orderId/status` | Admin: `status` |
| GET | `/api/reservations/availability` | Public: `reservationDate`, `guestCount`; up to 100 matching tables |
| POST | `/api/reservations` | Customer: `restaurantTableId`, `reservationDate`, `guestCount`, optional `specialRequest` |
| GET | `/api/reservations` | Customer's own; `status`, `date`, `page`, `limit` |
| GET | `/api/reservations/:reservationId` | Customer's own |
| PATCH | `/api/reservations/:reservationId/cancel` | Customer's own upcoming reservation |
| GET | `/api/admin/reservations` | Admin; `status`, `date`, `page`, `limit` |
| GET | `/api/admin/reservations/:reservationId` | Admin |
| PATCH | `/api/admin/reservations/:reservationId/status` | Admin: `status` |
| POST | `/api/admin/menu/categories` | Admin: `name`, `slug` |
| PATCH | `/api/admin/menu/categories/:categoryId` | Admin: nonempty subset of `name`, `slug` |
| DELETE | `/api/admin/menu/categories/:categoryId` | Admin; only unreferenced categories |
| POST | `/api/admin/menu/items` | Admin: dish fields below |
| PATCH | `/api/admin/menu/items/:menuItemId` | Admin: nonempty subset of dish fields |
| DELETE | `/api/admin/menu/items/:menuItemId` | Admin; only dishes without order history |
| PATCH | `/api/admin/menu/items/:menuItemId/availability` | Admin: `isAvailable` |
| GET | `/api/admin/tables` | Admin; `page`, `limit` |
| POST | `/api/admin/tables` | Admin: `tableNumber`, `capacity`, optional `isAvailable` |
| PATCH | `/api/admin/tables/:restaurantTableId` | Admin: nonempty subset of table fields |
| DELETE | `/api/admin/tables/:restaurantTableId` | Admin; only tables without reservation history |
| PATCH | `/api/admin/tables/:restaurantTableId/availability` | Admin: `isAvailable` |
| GET | `/api/admin/dashboard/summary` | Admin |
| GET | `/health` | Process liveness |
| GET | `/health/ready` | `SELECT 1`; 503 if PostgreSQL cannot be reached |

Dish fields: `name`, `description`, `price` (positive JSON number, at most two decimal places), `imageUrl` (HTTPS), `preparationTimeMinutes`, `categoryId`, optional `isAvailable` (true) and `isFeatured` (false).

Example order request (replace the ID with one returned from the menu API):

```json
{
  "orderType": "PICKUP",
  "items": [{ "menuItemId": "10000000-0000-4000-8000-000000000002", "quantity": 2 }],
  "notes": "Sauce on the side, please."
}
```

Example reservation (use an actual table ID and a future timestamp):

```json
{
  "restaurantTableId": "40000000-0000-4000-8000-000000000001",
  "reservationDate": "2030-09-07T18:30:00-04:00",
  "guestCount": 2,
  "specialRequest": "An anniversary dinner."
}
```

## Business rules and concurrency

- All money uses PostgreSQL `Decimal(10,2)` and Prisma Decimal arithmetic. Response prices/totals are **decimal strings**, e.g. `"59.97"`. Incoming totals, unit prices, user IDs, and statuses on order creation are rejected. Orders support only `DINE_IN` / `PICKUP`; no delivery or payment logic.
- Creating an order checks availability, calculates totals, and writes the order and items in one serializable transaction. Order item prices are snapshots. Duplicate menu IDs must be combined into one line; quantities are 1–20, with up to 50 distinct lines. There are no extra fees, so `subtotal === total`.
- Order progression: `PENDING → CONFIRMED → PREPARING → READY → COMPLETED`. Any nonterminal status can become `CANCELLED`. Repeating the current status is harmless; terminal orders cannot be reopened.
- Reservations last 90 minutes. The API requires an ISO timestamp with `Z` or an explicit timezone offset, converts it to UTC, and stores `reservationDate` as a UTC PostgreSQL timestamp. Date filters (`YYYY-MM-DD`) and dashboard “today” use **UTC**, explicitly, regardless of the server timezone. Convert restaurant-local times in the future frontend integration.
- Both `PENDING` and `CONFIRMED` reservations occupy the table. `CANCELLED` and `COMPLETED` do not. Half-open ranges permit one reservation to start exactly when the preceding one ends.
- A PostgreSQL GiST exclusion constraint prevents overlap even when a write bypasses application code. Serializable transactions with bounded retries also coordinate reservation creation with table capacity/availability edits. Conflicts return 409.
- Parties must fit the table and contain 1–8 guests. Capacity cannot shrink below an active or upcoming booking. Disabling a table prevents new reservations while retaining existing assignments.
- Reservations progress `PENDING → CONFIRMED → COMPLETED`, with cancellation from `PENDING` or `CONFIRMED`. Future reservations cannot be completed; started reservations cannot newly be confirmed. Customers may cancel only their own upcoming bookings; repeated cancellation is idempotent.
- Foreign keys restrict destructive deletes. Disable dishes/tables with history instead of deleting them. Categories must be empty before deletion. No endpoint deletes users or order history.
- Cross-customer ID lookups return 404, avoiding confirmation that someone else's record exists. Wrong-role access returns 403; missing/invalid/expired cookies return 401.

## Responses and errors

```json
{ "success": true, "message": "Order created successfully", "data": {} }
```

```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": [],
  "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
```

```json
{ "success": false, "message": "Reservation not found", "code": "RESERVATION_NOT_FOUND" }
```

Validation failures are 400 with friendly `{ field, message }` entries in `errors`. Unexpected errors are generic 500 responses. Logs include request IDs, method, response status, duration, safe error codes and stack frames, and operational events. They never deliberately log request bodies, full URLs/query strings, passwords, tokens, cookies, email addresses, or raw Prisma error messages. `X-Request-Id` can be used to correlate a response with its log entry.

Helmet, a 32 KB JSON limit, exact-origin CORS, CSRF checks, rate limits, and server-side authentication/authorization are applied centrally.

## Migrations and seed data

The checked-in initial migration includes SQL checks and the `btree_gist` exclusion constraint, which Prisma cannot express fully in its schema. Preserve those custom statements in later migrations.

```bash
# New schema change during development; requires a shadow database or permission to create one
npm run prisma:migrate -- --name describe_change
# Existing migrations, including initial installation and all production deployments
npm run prisma:migrate:deploy
# Regenerate after schema changes
npm run prisma:generate
# Development fixtures only
npm run prisma:seed
```

Never run `db push --force-reset`, `migrate reset`, or destructive schema commands in production. Apply migrations as an explicit release step. Back up production data and use backward-compatible migration changes when rolling versions.

Seeds include the two demo accounts, seven categories and dishes, six tables, two orders, and an upcoming reservation. Re-running retains existing records; sample reservations are not continuously moved to the future.

## Tests and checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
# All four in sequence
npm run check
```

`npm test` runs unit tests without PostgreSQL. HTTP integration tests use actual PostgreSQL transactions and constraints; they do not mock Prisma. Create a dedicated test database and migrate it first:

```bash
createdb orderfirst_test
# Set this to your dedicated test connection; never use the development/production database.
export TEST_DATABASE_URL='postgresql://user:password@localhost:5432/orderfirst_test'
DATABASE_URL="$TEST_DATABASE_URL" npm run prisma:migrate:deploy
npm run test:integration
```

Integration tests create uniquely named accounts/categories, use table number 901, and clean up their own records. Run one suite against a dedicated test database at a time. Tests cover login/cookies, permissions, validation, CSRF/CORS, price snapshots, unavailable dishes, transaction rollback, history protection, order transitions, concurrent and adjacent reservations, ownership, cancellation, direct database overlap protection, dashboard, and health endpoints.

## Production and Docker

```bash
npm ci
npm run prisma:generate
npm run check
npm run prisma:migrate:deploy
npm start
```

Production runs compiled `dist/server.js`, not a TypeScript runtime. Set `NODE_ENV=production`, HTTPS `FRONTEND_URL`, a random secret, and production `DATABASE_URL`. HTTPS should terminate at a correctly configured trusted proxy. SIGINT/SIGTERM stop accepting connections, drain existing requests, disconnect Prisma, and flush logs; shutdown has a 10-second deadline.

Optional container targets are provided:

```bash
docker build -t orderfirst-api .
docker build --target migrations -t orderfirst-migrations .
# Supply DATABASE_URL securely through your orchestrator or env file.
docker run --rm --env-file .env orderfirst-migrations
docker run --rm --env-file .env -p 4000:4000 orderfirst-api
```

Use a database hostname reachable from inside the container; `localhost` means the container itself. No database host or frontend origin is built into the image. The runtime uses a non-root user, stdout JSON logs, and a liveness health check. Probe `/health/ready` for deployment readiness. The migration target contains the Prisma CLI; the application runtime omits development dependencies.

## Jenkins / CI preparation

A future pipeline can run `npm ci → prisma:generate → lint → typecheck → test → build`, then provision a separate PostgreSQL service, deploy migrations to it, run `test:integration`, build/scan/push the image, apply production migrations, release, and poll `/health/ready`. Inject secrets through CI credentials, not source files. No Jenkins-specific application code or deployment automation is required yet.
