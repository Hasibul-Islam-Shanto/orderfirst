# Automated Screenshot Capture & README Walkthrough Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Create an automated Playwright script to capture high-resolution Retina screenshots (1920×1080 @ 2x DPR) of all OrderFirst pages (Customer and Admin management flows) and embed them step-by-step into `README.md`.

**Architecture:** A standalone Node.js ESM script (`scripts/capture-screenshots.mjs`) leveraging Playwright to run Chromium in headless mode across three isolated browser contexts (Public guest exploration, Authenticated customer session, and Authenticated admin session), capturing 15 standardized images to `docs/screenshots/` and documenting the flow in `README.md`.

**Tech Stack:** Node.js, Playwright, Chromium, React 19, Vite, Markdown.

---

### Task 1: Add Playwright Dependency and Script Configuration

**Files:**
- Modify: `client/package.json`

**Step 1: Install Playwright and browser binaries**
Run:
```bash
npm install --save-dev playwright --prefix client
npx playwright install chromium --prefix client
```

**Step 2: Add `screenshots` npm script to `client/package.json`**
Add `"screenshots": "node ../scripts/capture-screenshots.mjs"` to `scripts` in `client/package.json`.

**Step 3: Verify package script syntax and dependency presence**
Run: `npm run --prefix client | grep screenshots`
Expected: `screenshots` script is listed.

**Step 4: Commit**
```bash
git add client/package.json client/package-lock.json
git commit -m "build(client): add playwright and screenshots npm script"
```

---

### Task 2: Implement Standalone Capture Script `scripts/capture-screenshots.mjs`

**Files:**
- Create: `scripts/capture-screenshots.mjs`

**Step 1: Write `scripts/capture-screenshots.mjs`**
The script will:
- Parse `BASE_URL` (default `http://localhost:5173`) and optional flags (`--headed`).
- Ensure directory `docs/screenshots/` exists.
- Launch Chromium with viewport `{ width: 1920, height: 1080 }` and `deviceScaleFactor: 2`.
- Execute Flow 1: Public & Guest Pages:
  - `01-customer-home.png` (`/`)
  - `02-customer-menu.png` (`/menu`)
  - `03-customer-menu-detail.png` (`/menu/burrata`)
  - Add item to cart and capture `04-customer-cart.png` (`/cart`)
  - `05-customer-reservation-form.png` (`/reservations/new`)
  - `06-auth-login.png` (`/login`)
  - `07-auth-register.png` (`/register`)
- Execute Flow 2: Authenticated Customer Flow:
  - Clean browser context.
  - Sign in as `customer@orderfirst.dev` / `password123`.
  - `08-customer-my-orders.png` (`/my-orders`)
  - `09-customer-my-reservations.png` (`/my-reservations`)
  - `10-customer-account.png` (`/account`)
- Execute Flow 3: Authenticated Admin Flow:
  - Clean browser context.
  - Sign in as `admin@orderfirst.dev` / `password123`.
  - `11-admin-overview.png` (`/admin/overview`)
  - `12-admin-menu-management.png` (`/admin/menu`)
  - `13-admin-order-management.png` (`/admin/orders`)
  - `14-admin-reservation-management.png` (`/admin/reservations`)
  - `15-admin-table-management.png` (`/admin/tables`)
- Print summary table of captured files and dimensions.

**Step 2: Commit**
```bash
git add scripts/capture-screenshots.mjs
git commit -m "feat: implement automated Playwright screenshot capture script"
```

---

### Task 3: Execute Capture Script and Verify Screenshots

**Files:**
- Output directory: `docs/screenshots/*.png`

**Step 1: Ensure application server is reachable or boot Vite dev server**
Check server health at `BASE_URL` (e.g. `http://localhost:5173`).
Run the capture script:
```bash
node scripts/capture-screenshots.mjs
```

**Step 2: Verify all 15 screenshot files are generated**
Check:
```bash
ls -lh docs/screenshots/*.png
```
Expected: 15 PNG files, each approximately 200KB - 2MB with crisp 3840×2160 native resolution.

**Step 3: Commit screenshots**
```bash
git add docs/screenshots/
git commit -m "docs: generate high-resolution application screenshots"
```

---

### Task 4: Integrate Visual Walkthrough into `README.md`

**Files:**
- Modify: `README.md`

**Step 1: Embed structured visual tour**
Insert `## 📸 Application Walkthrough & Visual Tour` section with:
- Customer Experience Walkthrough with step-by-step descriptions and image links.
- Authentication & Demo Access.
- Admin Management Suite.
- Instructions to run/regenerate via `npm run screenshots --prefix client`.

**Step 2: Verify Markdown formatting and image paths**
Ensure all relative image paths `docs/screenshots/*.png` correctly resolve and preview.

**Step 3: Commit**
```bash
git add README.md
git commit -m "docs: add visual application walkthrough to README"
```

---

### Task 5: Final Review and Validation

**Files:**
- Modify: `docs/plans/task.md`

**Step 1: Review git diff**
Run `git status` and `git log -n 5` to confirm clean commits.

**Step 2: Update checklist**
Mark all tasks complete in `docs/plans/task.md`.
