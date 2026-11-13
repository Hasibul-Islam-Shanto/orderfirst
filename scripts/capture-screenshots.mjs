#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const screenshotsDir = path.resolve(projectRoot, 'docs/screenshots');

// Resolve Playwright
let playwright;
try {
  playwright = await import('playwright');
} catch {
  playwright = await import(
    path.resolve(projectRoot, 'client/node_modules/playwright/index.mjs')
  );
}
const { chromium } = playwright;

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const isHeaded = process.argv.includes('--headed');
const VIEWPORT = { width: 1920, height: 1080 };
const DEVICE_SCALE_FACTOR = 2; // 2x DPR for crisp Retina quality

const DEMO_CUSTOMER = {
  email: 'customer@orderfirst.dev',
  password: 'password123',
  name: 'Eleanor Vance',
};

const DEMO_ADMIN = {
  email: 'admin@orderfirst.dev',
  password: 'password123',
  name: 'Marcus Sterling',
};

// Mock data fixtures (used if backend microservices are offline)
const MOCK_CATEGORIES = [
  { id: 'cat-1', name: 'Starters', slug: 'starters' },
  { id: 'cat-2', name: 'Main Course', slug: 'mains' },
  { id: 'cat-3', name: 'Burgers', slug: 'burgers' },
  { id: 'cat-4', name: 'Pizza', slug: 'pizza' },
  { id: 'cat-5', name: 'Pasta', slug: 'pasta' },
  { id: 'cat-6', name: 'Desserts', slug: 'desserts' },
  { id: 'cat-7', name: 'Drinks', slug: 'drinks' },
];

const MOCK_MENU_ITEMS = [
  {
    id: 'burrata',
    name: 'Heirloom Burrata',
    description: 'Creamy burrata, sun-ripened heirloom tomatoes, fresh basil, and extra virgin olive oil.',
    price: 14,
    imageUrl: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=900&q=85',
    categoryId: 'cat-1',
    isAvailable: true,
    isFeatured: true,
    preparationTimeMinutes: 10,
    category: MOCK_CATEGORIES[0],
  },
  {
    id: 'burger',
    name: 'The House Burger',
    description: 'Flame-grilled beef, aged cheddar, caramelized onions, and house sauce on brioche.',
    price: 18,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=85',
    categoryId: 'cat-3',
    isAvailable: true,
    isFeatured: true,
    preparationTimeMinutes: 20,
    category: MOCK_CATEGORIES[2],
  },
  {
    id: 'pasta',
    name: 'Truffle Mushroom Pasta',
    description: 'Silky tagliatelle with woodland mushrooms, parmesan cream, fresh thyme, and black truffle.',
    price: 22,
    imageUrl: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=85',
    categoryId: 'cat-5',
    isAvailable: true,
    isFeatured: true,
    preparationTimeMinutes: 20,
    category: MOCK_CATEGORIES[4],
  },
  {
    id: 'salmon',
    name: 'Herb-Roasted Salmon',
    description: 'Atlantic salmon, seasonal greens, roasted baby potatoes, and a bright lemon butter sauce.',
    price: 28,
    imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=85',
    categoryId: 'cat-2',
    isAvailable: true,
    isFeatured: true,
    preparationTimeMinutes: 25,
    category: MOCK_CATEGORIES[1],
  },
  {
    id: 'pizza',
    name: 'Margherita Rustica',
    description: 'Wood-fired sourdough, San Marzano tomatoes, fior di latte mozzarella, and garden basil.',
    price: 19,
    imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=85',
    categoryId: 'cat-4',
    isAvailable: true,
    isFeatured: false,
    preparationTimeMinutes: 18,
    category: MOCK_CATEGORIES[3],
  },
  {
    id: 'steak',
    name: 'Chargrilled Ribeye',
    description: 'Tender ribeye with rosemary fries, peppercorn sauce, and watercress salad.',
    price: 36,
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=900&q=85',
    categoryId: 'cat-2',
    isAvailable: true,
    isFeatured: false,
    preparationTimeMinutes: 30,
    category: MOCK_CATEGORIES[1],
  },
];

const MOCK_TABLES = [
  { id: 'tbl-1', tableNumber: 1, capacity: 2, isAvailable: true },
  { id: 'tbl-2', tableNumber: 2, capacity: 4, isAvailable: true },
  { id: 'tbl-3', tableNumber: 3, capacity: 4, isAvailable: false },
  { id: 'tbl-4', tableNumber: 4, capacity: 6, isAvailable: true },
  { id: 'tbl-5', tableNumber: 5, capacity: 8, isAvailable: true },
];

const MOCK_ORDERS = [
  {
    id: 'ord-101',
    userId: 'usr-customer',
    customerName: 'Eleanor Vance',
    customerEmail: 'customer@orderfirst.dev',
    status: 'IN_PREPARATION',
    orderType: 'DINE_IN',
    total: 44.0,
    notes: 'Table 4 · Dressing on the side',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    items: [
      { id: 'oi-1', quantity: 1, unitPrice: 14, menuItemId: 'burrata', menuItemName: 'Heirloom Burrata', menuItem: MOCK_MENU_ITEMS[0] },
      { id: 'oi-2', quantity: 1, unitPrice: 18, menuItemId: 'burger', menuItemName: 'The House Burger', menuItem: MOCK_MENU_ITEMS[1] },
      { id: 'oi-3', quantity: 2, unitPrice: 6, menuItemId: 'drinks', menuItemName: 'Sparkling Lemonade' },
    ],
  },
  {
    id: 'ord-102',
    userId: 'usr-customer',
    customerName: 'Eleanor Vance',
    customerEmail: 'customer@orderfirst.dev',
    status: 'COMPLETED',
    orderType: 'PICKUP',
    total: 28.0,
    notes: 'Please pack eco-friendly utensils',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    items: [
      { id: 'oi-4', quantity: 1, unitPrice: 28, menuItemId: 'salmon', menuItemName: 'Herb-Roasted Salmon', menuItem: MOCK_MENU_ITEMS[3] },
    ],
  },
];

const MOCK_RESERVATIONS = [
  {
    id: 'res-201',
    userId: 'usr-customer',
    customerName: 'Eleanor Vance',
    customerEmail: 'customer@orderfirst.dev',
    restaurantTableId: 'tbl-2',
    restaurantTable: MOCK_TABLES[1],
    reservationDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    guestCount: 4,
    specialRequest: 'Window booth preferred for anniversary celebration',
    status: 'CONFIRMED',
  },
  {
    id: 'res-202',
    userId: 'usr-customer',
    customerName: 'Eleanor Vance',
    customerEmail: 'customer@orderfirst.dev',
    restaurantTableId: 'tbl-4',
    restaurantTable: MOCK_TABLES[3],
    reservationDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    guestCount: 6,
    specialRequest: null,
    status: 'COMPLETED',
  },
];

async function isUrlReachable(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(2000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function setupMockApiRoute(context, currentUserRole = null) {
  await context.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '');
    const method = request.method();

    const json = (data, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(data),
      });

    // 1. Auth / Current User
    if (path === '/auth/me') {
      if (!currentUserRole) {
        return json({ message: 'Unauthenticated' }, 401);
      }
      return json({
        success: true,
        message: 'Current user',
        data: {
          id: currentUserRole === 'admin' ? 'usr-admin' : 'usr-customer',
          name: currentUserRole === 'admin' ? DEMO_ADMIN.name : DEMO_CUSTOMER.name,
          email: currentUserRole === 'admin' ? DEMO_ADMIN.email : DEMO_CUSTOMER.email,
          role: currentUserRole === 'admin' ? 'ADMIN' : 'CUSTOMER',
          emailVerifiedAt: '2026-01-01T00:00:00.000Z',
        },
      });
    }

    // 2. Auth Login
    if (path === '/auth/login' && method === 'POST') {
      const body = request.postDataJSON() || {};
      const isAdmin = body.email === DEMO_ADMIN.email || body.email?.includes('admin');
      return json({
        success: true,
        message: 'Signed in successfully',
        data: {
          id: isAdmin ? 'usr-admin' : 'usr-customer',
          name: isAdmin ? DEMO_ADMIN.name : DEMO_CUSTOMER.name,
          email: body.email,
          role: isAdmin ? 'ADMIN' : 'CUSTOMER',
          emailVerifiedAt: '2026-01-01T00:00:00.000Z',
        },
      });
    }

    // 3. Menu Categories
    if (path.startsWith('/menu/categories')) {
      return json({
        success: true,
        message: 'Categories',
        data: MOCK_CATEGORIES,
        pagination: { page: 1, limit: 100, total: MOCK_CATEGORIES.length, totalPages: 1 },
      });
    }

    // 4. Menu Items
    if (path.startsWith('/menu/items')) {
      const parts = path.split('/').filter(Boolean);
      if (parts.length > 2) {
        const item = MOCK_MENU_ITEMS.find((m) => m.id === parts[2]) || MOCK_MENU_ITEMS[0];
        return json({ success: true, message: 'Menu item', data: item });
      }
      return json({
        success: true,
        message: 'Menu items',
        data: MOCK_MENU_ITEMS,
        pagination: { page: 1, limit: 100, total: MOCK_MENU_ITEMS.length, totalPages: 1 },
      });
    }

    // 5. Customer Orders
    if (path.startsWith('/orders')) {
      return json({
        success: true,
        message: 'Orders',
        data: MOCK_ORDERS,
        pagination: { page: 1, limit: 50, total: MOCK_ORDERS.length, totalPages: 1 },
      });
    }

    // 6. Customer Reservations
    if (path.startsWith('/reservations/availability')) {
      return json({ success: true, message: 'Available tables', data: MOCK_TABLES });
    }
    if (path.startsWith('/reservations')) {
      return json({
        success: true,
        message: 'Reservations',
        data: MOCK_RESERVATIONS,
        pagination: { page: 1, limit: 50, total: MOCK_RESERVATIONS.length, totalPages: 1 },
      });
    }

    // 7. Admin Dashboard Summary
    if (path.startsWith('/admin/dashboard/summary')) {
      return json({
        success: true,
        message: 'Dashboard summary',
        data: {
          todayRevenue: 2840.5,
          todayOrders: 38,
          upcomingReservations: 12,
          availableTables: 4,
          recentOrders: MOCK_ORDERS,
          popularMenuItems: [
            { menuItem: MOCK_MENU_ITEMS[1], quantity: 24 },
            { menuItem: MOCK_MENU_ITEMS[0], quantity: 19 },
            { menuItem: MOCK_MENU_ITEMS[2], quantity: 15 },
          ],
        },
      });
    }

    // 8. Admin Orders
    if (path.startsWith('/admin/orders')) {
      return json({
        success: true,
        message: 'Admin orders',
        data: MOCK_ORDERS,
        pagination: { page: 1, limit: 10, total: MOCK_ORDERS.length, totalPages: 1 },
      });
    }

    // 9. Admin Reservations
    if (path.startsWith('/admin/reservations')) {
      return json({
        success: true,
        message: 'Admin reservations',
        data: MOCK_RESERVATIONS,
        pagination: { page: 1, limit: 10, total: MOCK_RESERVATIONS.length, totalPages: 1 },
      });
    }

    // 10. Admin Tables
    if (path.startsWith('/admin/tables')) {
      return json({
        success: true,
        message: 'Admin tables',
        data: MOCK_TABLES,
        pagination: { page: 1, limit: 10, total: MOCK_TABLES.length, totalPages: 1 },
      });
    }

    // Fallback pass through
    await route.continue();
  });
}

async function capture(page, fileName, description) {
  const filePath = path.join(screenshotsDir, fileName);
  process.stdout.write(`  📸 Capturing ${fileName}... `);

  // Wait for network and DOM stabilization
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(600); // Allow CSS transitions and fonts to settle

  await page.screenshot({
    path: filePath,
    fullPage: false, // 16:9 uniform widescreen frame
  });

  const stats = await fs.stat(filePath);
  const sizeKb = Math.round(stats.size / 1024);
  console.log(`✓ (${sizeKb} KB) — ${description}`);
}

async function main() {
  console.log('====================================================');
  console.log('   OrderFirst Automated Screenshot Capture Pipeline ');
  console.log('====================================================');

  await fs.mkdir(screenshotsDir, { recursive: true });

  // 1. Ensure Vite Server is Running
  let devServer = null;
  const clientUp = await isUrlReachable(BASE_URL);
  if (!clientUp) {
    console.log(`⚡ Vite server not detected at ${BASE_URL}. Launching local Vite preview/dev...`);
    devServer = spawn('npx', ['vite', '--port', '5173'], {
      cwd: path.resolve(projectRoot, 'client'),
      stdio: 'pipe',
      detached: false,
    });

    // Wait for server to respond
    let attempts = 0;
    while (attempts < 20) {
      await new Promise((r) => setTimeout(r, 600));
      if (await isUrlReachable(BASE_URL)) break;
      attempts++;
    }

    if (!(await isUrlReachable(BASE_URL))) {
      if (devServer) devServer.kill();
      throw new Error(`Failed to start Vite server at ${BASE_URL}`);
    }
    console.log(`✓ Vite server ready at ${BASE_URL}`);
  } else {
    console.log(`✓ Found running web server at ${BASE_URL}`);
  }

  // 2. Check Backend Gateway Status
  const backendUp = await isUrlReachable('http://localhost:4000/health');
  if (backendUp) {
    console.log('✓ API Gateway detected at :4000 (Using live microservices)');
  } else {
    console.log('ℹ API Gateway (:4000) not detected (Using high-fidelity mock data)');
  }

  // 3. Launch Playwright
  console.log('\n🚀 Launching Chromium (Viewport 1920x1080 @ 2x DPR)...');
  const browser = await chromium.launch({
    headless: !isHeaded,
  });

  try {
    // =========================================================================
    // FLOW 1: Public & Guest Flow
    // =========================================================================
    console.log('\n--- [1/3] Public & Guest Experience Flow ---');
    const guestContext = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
    });
    if (!backendUp) await setupMockApiRoute(guestContext, null);
    const guestPage = await guestContext.newPage();

    // 01. Home Page
    await guestPage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await capture(guestPage, '01-customer-home.png', 'Customer Landing Page & Featured Highlights');

    // 02. Menu Page
    await guestPage.goto(`${BASE_URL}/menu`, { waitUntil: 'networkidle' });
    await capture(guestPage, '02-customer-menu.png', 'Menu Catalog with Category Tabs & Filters');

    // 03. Menu Detail
    await guestPage.goto(`${BASE_URL}/menu/burrata`, { waitUntil: 'networkidle' });
    await capture(guestPage, '03-customer-menu-detail.png', 'Item Detail with Ingredients & Add to Cart');

    // 04. Add Item & Cart Page
    const addToCartBtn = guestPage.locator('button:has-text("Add to cart")');
    if (await addToCartBtn.count() > 0) {
      await addToCartBtn.first().click();
      await guestPage.waitForTimeout(500);
    }
    await guestPage.goto(`${BASE_URL}/cart`, { waitUntil: 'networkidle' });
    await capture(guestPage, '04-customer-cart.png', 'Active Shopping Cart with Order Summary');

    // 05. Reservation Form
    await guestPage.goto(`${BASE_URL}/reservations/new`, { waitUntil: 'networkidle' });
    await capture(guestPage, '05-customer-reservation-form.png', 'Table Booking Form & Guest Selector');

    // 06. Login Page
    await guestPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await capture(guestPage, '06-auth-login.png', 'Sign In Screen with Demo Access Shortcuts');

    // 07. Register Page
    await guestPage.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' });
    await capture(guestPage, '07-auth-register.png', 'Customer Registration & Onboarding');

    await guestContext.close();

    // =========================================================================
    // FLOW 2: Customer Authenticated Flow
    // =========================================================================
    console.log('\n--- [2/3] Authenticated Customer Flow (customer@orderfirst.dev) ---');
    const customerContext = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
    });
    if (!backendUp) await setupMockApiRoute(customerContext, 'customer');
    const customerPage = await customerContext.newPage();

    // Log in
    await customerPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await customerPage.fill('input#email', DEMO_CUSTOMER.email);
    await customerPage.fill('input#password', DEMO_CUSTOMER.password);
    await customerPage.click('button.button.full');
    await customerPage.waitForTimeout(600);

    // 08. My Orders
    await customerPage.goto(`${BASE_URL}/my-orders`, { waitUntil: 'networkidle' });
    await capture(customerPage, '08-customer-my-orders.png', 'Customer Order History & Live Tracking');

    // 09. My Reservations
    await customerPage.goto(`${BASE_URL}/my-reservations`, { waitUntil: 'networkidle' });
    await capture(customerPage, '09-customer-my-reservations.png', 'Customer Table Reservations & Status');

    // 10. Account Profile
    await customerPage.goto(`${BASE_URL}/account`, { waitUntil: 'networkidle' });
    await capture(customerPage, '10-customer-account.png', 'Customer Account Profile & Preferences');

    await customerContext.close();

    // =========================================================================
    // FLOW 3: Admin Management Flow
    // =========================================================================
    console.log('\n--- [3/3] Authenticated Admin Management Flow (admin@orderfirst.dev) ---');
    const adminContext = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
    });
    if (!backendUp) await setupMockApiRoute(adminContext, 'admin');
    const adminPage = await adminContext.newPage();

    // Log in
    await adminPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await adminPage.fill('input#email', DEMO_ADMIN.email);
    await adminPage.fill('input#password', DEMO_ADMIN.password);
    await adminPage.click('button.button.full');
    await adminPage.waitForTimeout(600);

    // 11. Admin Overview / Dashboard
    await adminPage.goto(`${BASE_URL}/admin/overview`, { waitUntil: 'networkidle' });
    await capture(adminPage, '11-admin-overview.png', 'Admin Executive KPI Dashboard & Metrics');

    // 12. Admin Menu Management
    await adminPage.goto(`${BASE_URL}/admin/menu`, { waitUntil: 'networkidle' });
    await capture(adminPage, '12-admin-menu-management.png', 'Admin Menu Catalog & Availability Manager');

    // 13. Admin Order Management
    await adminPage.goto(`${BASE_URL}/admin/orders`, { waitUntil: 'networkidle' });
    await capture(adminPage, '13-admin-order-management.png', 'Admin Order Management & Kitchen Pipeline');

    // 14. Admin Reservation Management
    await adminPage.goto(`${BASE_URL}/admin/reservations`, { waitUntil: 'networkidle' });
    await capture(adminPage, '14-admin-reservation-management.png', 'Admin Table Booking & Seating Timetable');

    // 15. Admin Table Management
    await adminPage.goto(`${BASE_URL}/admin/tables`, { waitUntil: 'networkidle' });
    await capture(adminPage, '15-admin-table-management.png', 'Admin Floor Plan & Restaurant Table Manager');

    await adminContext.close();

    console.log('\n====================================================');
    console.log('🎉 Successfully captured all 15 high-res screenshots!');
    console.log(`📁 Destination: ${screenshotsDir}`);
    console.log('====================================================\n');
  } finally {
    await browser.close();
    if (devServer) {
      devServer.kill();
    }
  }
}

main().catch((err) => {
  console.error('\n❌ Screenshot capture failed:', err);
  process.exit(1);
});
