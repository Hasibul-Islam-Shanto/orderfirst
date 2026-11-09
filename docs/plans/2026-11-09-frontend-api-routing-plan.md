# Frontend Same-Origin API Routing & Deployment Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Route all frontend API requests through Nginx reverse proxy on port 80 to the internal API Gateway, eliminating `localhost` connection errors and cross-origin firewall restrictions.

**Architecture:** The React SPA client served by Nginx on port 80 uses a relative base path (`/api`). The browser sends API calls to port 80 (same origin). Nginx intercepts all `/api/*` requests and proxies them over the Docker bridge network to `http://gateway:4000`, which forwards to backend microservices (`auth:4001`, `catalog:4002`, etc.).

**Tech Stack:** React 19, Vite, TypeScript, Nginx (Alpine), Express (API Gateway), Docker Compose, Jenkins CI/CD.

---

## Architecture Flow

```
[ Visitor Browser (Your Laptop) ]
          │
          │ 1. GET http://54.234.43.3/ (loads HTML & JS bundle)
          │ 2. POST http://54.234.43.3/api/auth/register (Same-origin port 80)
          ▼
[ AWS EC2 Instance ]
  ┌─────────────────────────────────────────────────────────────┐
  │ Port 80: Nginx Container (orderfirst-client-dev)            │
  │   - Location /     -> Serves compiled React SPA assets      │
  │   - Location /api  -> proxy_pass http://gateway:4000/api    │
  └──────────────────────────────┬──────────────────────────────┘
                                 │ Docker Bridge Network
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ Port 4000 (Internal): Express API Gateway                   │
  │   - Same-origin CORS & CSRF validation                      │
  │   - Routes /api/auth/* -> http://auth:4001                  │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ Port 4001 (Internal): Auth Microservice                     │
  │   - Executes user registration & hashes password            │
  │   - Writes to PostgreSQL (auth schema)                      │
  └─────────────────────────────────────────────────────────────┘
```

---

## Root Cause Analysis: Why `index-D1qzyIGi.js` Had `localhost:4000`

1. **Vite Build-Time Replacement:**
   In `client/src/lib/api-client.ts`, the code was:
   ```ts
   export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000/api").replace(/\/$/, "");
   ```
   When the Docker image was built during previous Jenkins jobs, Vite compiled the TypeScript into `index-D1qzyIGi.js` and replaced `import.meta.env.VITE_API_URL` with the string literal `"http://localhost:4000/api"`.

2. **Why Editing `.env.dev` on the Server Had No Effect:**
   - React is not running on Node.js on the server; it runs in the visitor's browser.
   - Nginx simply delivers the already-compiled static JavaScript file `index-D1qzyIGi.js` to the browser.
   - The `.js` file on disk inside the container still contained the text `"http://localhost:4000/api"`.
   - Modifying `.env.dev` on EC2 does not recompile static `.js` files.

---

## Tasks & Steps

### Task 1: Verify Codebase Changes (Committed in `1a440bf`)

**Files Modified:**
- `client/nginx.conf`: Added `/api` proxy pass to `http://gateway:4000`.
- `client/src/lib/api-client.ts`: Defaulted fallback `API_URL` to `"/api"`.
- `client/vite.config.ts`: Added local dev proxy for `/api`.
- `deploy/compose/docker-compose.dev.yml`: Set `VITE_API_URL=/api` build arg and joined `internal` network.
- `services/gateway/src/app.ts` & `security.ts`: Allowed same-origin requests forwarded by Nginx.

**Verification:**
Run: `npm --prefix client run build && npm --prefix services/gateway test`
Expected: 100% build clean, all 6 gateway tests pass.

---

### Task 2: Build & Deploy New Docker Images in Jenkins

**Action:**
1. Open Jenkins: `http://54.234.43.3:8080/job/orderfirst-dev/`
2. Ensure build for commit `1a440bf` is triggered and completes.
3. Verify the **Rolling Deployment** stage finishes with `[SUCCESS] Deployment healthy! Services are online.`

---

### Task 3: Verify Nginx Reverse Proxy on EC2

**Step 1: Test Gateway Health through Nginx Port 80**
Run on EC2 terminal:
```bash
curl -i http://localhost/api/health
```
**Expected Output:**
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
{"status":"ok","service":"gateway"}
```
*(Confirms Nginx on port 80 successfully talks to Gateway on port 4000 over the internal Docker network)*.

**Step 2: Inspect New Client Bundle Hash**
Run on EC2 terminal:
```bash
docker exec -it orderfirst-client-dev ls -la /usr/share/nginx/html/assets/
```
**Expected Output:**
The bundle filename will be a NEW hash (e.g., `index-DeAKcqjG.js`), replacing the old `index-D1qzyIGi.js`.

---

### Task 4: Verify in Browser (Client Side)

**Step 1: Force Hard Refresh to Clear Old Cached JS**
- Chrome/Edge on Mac: `Cmd + Shift + R`
- Chrome/Edge on Windows/Linux: `Ctrl + Shift + R`
- Or test in a **Private / Incognito Window**.

**Step 2: Inspect Network Tab on Registration**
1. Open Developer Tools (`F12`) -> **Network** tab.
2. Fill out the registration form and click submit.
3. Verify the request URL:
   - **Request URL:** `http://54.234.43.3/api/auth/register` (relative same-origin on port 80).
   - **NOT** `http://localhost:4000/api/auth/register`.
4. Response Status: `201 Created` or `200 OK`.

