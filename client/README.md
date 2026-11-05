# OrderFirst Client

React SPA for the OrderFirst restaurant ordering and reservation platform.

## Tech Stack

- React 19 + TypeScript
- React Router 7
- TanStack Query (API server state and caching)
- Zustand (cart, theme, and other client-only state)
- Tailwind CSS 4
- Vite

## Getting Started

```bash
npm install
npm run dev
```

Ensure the microservices infrastructure is running (`infra/docker-compose.yml`). The client connects to the API Gateway at `http://localhost:4000/api`.

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run regression tests |
| `npm run check` | Run type checking, lint, tests, and production build |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run format` | Format code with Prettier |

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Customer | `customer@orderfirst.dev` | `password123` |
| Admin | `admin@orderfirst.dev` | `password123` |

## Project Structure

```
src/
├── app/          # App shell and router
├── components/   # Shared UI components
├── features/     # Customer and admin pages
├── layouts/      # Page layouts
├── lib/          # API client, query keys/client, schemas, adapters
├── mocks/        # Static decorative image helpers and test fixtures
├── store/        # Zustand stores for cart and theme only
├── types/        # TypeScript types
└── utils/        # Formatting helpers
```

## Backend integration

All API requests go through `src/lib/api-client.ts`, include cookies and the backend's CSRF header, and normalize API errors. Authentication is sourced from `GET /auth/me`; JWTs and user records are never stored in browser storage.

TanStack Query owns menu, auth, order, reservation, dashboard, and table state. Its defaults use a 60-second stale time, a 10-minute garbage-collection window, no focus refetch, and at most two retries for server/network failures. Individual features shorten or extend stale times according to how dynamic their data is. Mutations invalidate only related query families.

Customer menu browsing uses page-based infinite querying with an intersection observer and a visible Load More control. Admin resources use traditional page navigation.

## Frontend behavior

Reservation drafts travel through login and registration in browser history state; availability is checked by the API before confirmation. Cart display uses current menu data, while the backend recalculates authoritative order totals and retains item price snapshots.
