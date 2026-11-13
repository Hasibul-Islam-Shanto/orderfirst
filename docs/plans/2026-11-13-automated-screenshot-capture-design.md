# Automated Playwright Screenshot Capture & README Walkthrough Design

## 1. Executive Summary
This document specifies the architecture and implementation design for an automated Playwright-based high-resolution screenshot generation pipeline for OrderFirst. The pipeline captures all customer and admin management flows using demo accounts, produces Retina-quality 2x scale screenshots in `docs/screenshots/`, and embeds them into `README.md` arranged as an end-to-end visual tour.

## 2. Requirements & Constraints
- **Target Resolution**: 1920×1080 viewport with a `deviceScaleFactor` of `2` (crisp Retina 3840×2160 pixel density).
- **Target Output Directory**: `docs/screenshots/`.
- **Target Base URL**: Default `http://localhost:5173` with override capability via `BASE_URL`.
- **Authentication Credentials**:
  - Customer: `customer@orderfirst.dev` / `password123`
  - Admin: `admin@orderfirst.dev` / `password123`
- **Execution Style**: Standalone ESM Playwright script (`scripts/capture-screenshots.mjs`) triggered via npm script (`npm run screenshots` in `client`).

## 3. Architecture & Context Isolation

The capture pipeline runs sequentially through three isolated browser contexts to prevent session and cookie cross-contamination:

```
[Browser: Chromium Headless]
  │
  ├── Context 1: Public & Guest Exploration
  │     ├── 01-customer-home.png (/)
  │     ├── 02-customer-menu.png (/menu)
  │     ├── 03-customer-menu-detail.png (/menu/burrata)
  │     ├── 04-customer-cart.png (/cart with added items)
  │     ├── 05-customer-reservation-form.png (/reservations/new)
  │     ├── 06-auth-login.png (/login)
  │     └── 07-auth-register.png (/register)
  │
  ├── Context 2: Authenticated Customer Flow (customer@orderfirst.dev)
  │     ├── Login submission & cookie persistence
  │     ├── 08-customer-my-orders.png (/my-orders)
  │     ├── 09-customer-my-reservations.png (/my-reservations)
  │     └── 10-customer-account.png (/account)
  │
  └── Context 3: Authenticated Admin Management Flow (admin@orderfirst.dev)
        ├── Login submission & cookie persistence
        ├── 11-admin-overview.png (/admin/overview)
        ├── 12-admin-menu-management.png (/admin/menu)
        ├── 13-admin-order-management.png (/admin/orders)
        ├── 14-admin-reservation-management.png (/admin/reservations)
        └── 15-admin-table-management.png (/admin/tables)
```

## 4. Page Stabilization & Reliability Guarantees
- **Wait conditions**: `networkidle` state and element stability before each capture.
- **Hydration & Skeleton dismiss**: Await detachment of skeleton elements (`.skeleton`) before triggering `page.screenshot()`.
- **Cart population**: Add an active item to cart prior to capturing `/cart` to display populated state rather than empty state.
- **Configurable headless mode**: Headless by default, with `--headed` flag support for debugging.

## 5. README Integration
Screenshots will be arranged logically in `README.md` under `## 📸 Application Walkthrough & Visual Tour`:
1. Customer Experience Walkthrough (Discovery, Dish Details, Cart, Table Booking, Live Tracking).
2. Authentication & Demo Access (Login & Register).
3. Admin & Kitchen Management Suite (KPI Overview, Live Order Kanban, Menu CRUD, Table & Reservation Management).
4. Command instructions for on-demand screenshot regeneration.

