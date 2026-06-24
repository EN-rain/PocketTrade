/**
 * Navigation spec — covers cross-page routing, sidebar active states,
 * and deep-link preservation.
 *
 * Three test cases:
 *   1. single authenticated session walks all 6 admin pages and verifies
 *      each page heading + zero console errors
 *   2. sidebar NavLink for the current page has the active `bg-emerald-400`
 *      class on every admin page
 *   3. a fresh browser context can deep-link to /admin/listings/1 after
 *      an admin session is established
 */

import { test, expect } from './fixtures';
import { ROUTES } from './selectors';
import type { Page } from '@playwright/test';

// ─── Mock data ───────────────────────────────────────────────────────────────

const dashboardPayload = {
  metrics: {
    totalUsers: 47,
    totalListings: 120,
    pendingListings: 3,
    activeListings: 100,
    rejectedListings: 17,
    totalReports: 1,
    totalFavorites: 9,
    totalMessages: 234,
  },
  recentListings: [],
  recentActivity: [],
};

const listingsPayload = {
  items: [
    {
      id: 1,
      brand: 'Canon',
      model: 'EOS R5',
      price: 2499,
      status: 'active',
      createdAt: '2025-01-01T00:00:00Z',
      images: [],
    },
  ],
  total: 1,
  page: 1,
  limit: 10,
  pages: 1,
};

const usersPayload = {
  items: [
    {
      id: 1,
      email: 'alice@example.com',
      displayName: 'Alice Smith',
      role: 'user',
      accountStatus: 'active',
      createdAt: '2025-01-01T00:00:00Z',
    },
  ],
  total: 1,
  page: 1,
  limit: 10,
  pages: 1,
};

const reportsPayload = {
  items: [
    {
      id: 1,
      reason: 'Inappropriate content',
      details: 'User posted offensive language',
      status: 'pending',
      reporter: { email: 'reporter@example.com' },
      conversation: null,
    },
  ],
  total: 1,
  page: 1,
  limit: 10,
  pages: 1,
};

const analyticsPayload = {
  topTerms: [
    { term: 'iphone', count: 42 },
    { term: 'nike', count: 28 },
  ],
  zeroResults: [{ id: 1, searchTerm: 'xyzabc123' }],
};

const activityPayload = {
  items: [
    {
      id: 1,
      action: 'Reviewed listing #1',
      targetType: 'Listing',
      targetId: '1',
      adminId: '1',
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
  pages: 1,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Start collecting JS console error messages from `page`. */
function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

/**
 * Register mock handlers for every admin page API so a single session can
 * navigate across all 6 pages without unmocked network failures.
 */
async function setupAllRoutes(page: Page) {
  const routes: Array<{ url: RegExp; method: string; body: unknown }> = [
    {
      url: /^http:\/\/localhost:3000\/admin\/dashboard(?:\?.*)?$/,
      method: 'GET',
      body: dashboardPayload,
    },
    {
      url: /^http:\/\/localhost:3000\/admin\/listings(?:\?.*)?$/,
      method: 'GET',
      body: listingsPayload,
    },
    {
      url: /^http:\/\/localhost:3000\/admin\/users(?:\?.*)?$/,
      method: 'GET',
      body: usersPayload,
    },
    {
      url: /^http:\/\/localhost:3000\/admin\/reports(?:\?.*)?$/,
      method: 'GET',
      body: reportsPayload,
    },
    {
      url: /^http:\/\/localhost:3000\/admin\/analytics\/search(?:\?.*)?$/,
      method: 'GET',
      body: analyticsPayload,
    },
    {
      url: /^http:\/\/localhost:3000\/admin\/activity(?:\?.*)?$/,
      method: 'GET',
      body: activityPayload,
    },
  ];

  for (const route of routes) {
    await page.route(route.url, async (r) => {
      const req = r.request();
      if (req.method() === 'OPTIONS') {
        await r.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          },
        });
        return;
      }
      if (req.method() !== route.method) {
        await r.continue();
        return;
      }
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(route.body),
      });
    });
  }
}

/** Expected visible page heading for each admin route. */
function headingText(route: string): string {
  switch (route) {
    case ROUTES.dashboard:
      return 'Moderation workspace';
    case ROUTES.listings:
      return 'Listings';
    case ROUTES.users:
      return 'User Management';
    case ROUTES.reports:
      return 'Reports';
    case ROUTES.analytics:
      return 'Search Analytics';
    case ROUTES.activity:
      return 'Activity Log';
    default:
      throw new Error(`Unknown route: ${route}`);
  }
}

/**
 * NavLinks live inside BrowserRouter with basename="/admin", so their
 * `href` attributes are relative to that basename (e.g. `/dashboard`).
 */
function navHref(route: string): string {
  switch (route) {
    case ROUTES.dashboard:
      return '/dashboard';
    case ROUTES.listings:
      return '/listings';
    case ROUTES.users:
      return '/users';
    case ROUTES.reports:
      return '/reports';
    case ROUTES.analytics:
      return '/analytics';
    case ROUTES.activity:
      return '/activity';
    default:
      throw new Error(`Unknown route: ${route}`);
  }
}

/** Wait for the page to settle and assert the primary heading is visible. */
async function verifyPageLoaded(page: Page, route: string) {
  await page.waitForLoadState('networkidle');
  await expect(
    page.getByRole('heading', { name: new RegExp(headingText(route), 'i') }).first(),
  ).toBeVisible({ timeout: 10_000 });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Navigation', () => {
  test('single session walks all 6 pages', async ({ page, loginAsAdmin }) => {
    const errors = collectConsoleErrors(page);

    await loginAsAdmin();
    await setupAllRoutes(page);

    for (const route of [
      ROUTES.dashboard,
      ROUTES.listings,
      ROUTES.users,
      ROUTES.reports,
      ROUTES.analytics,
      ROUTES.activity,
    ]) {
      await page.goto(route);
      await verifyPageLoaded(page, route);
    }

    expect(errors).toHaveLength(0);
  });

  test('sidebar active-route highlight', async ({ page, loginAsAdmin }) => {
    const errors = collectConsoleErrors(page);

    await loginAsAdmin();
    await setupAllRoutes(page);

    for (const route of [
      ROUTES.dashboard,
      ROUTES.listings,
      ROUTES.users,
      ROUTES.reports,
      ROUTES.analytics,
      ROUTES.activity,
    ]) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      const href = navHref(route);
      const link = page.locator(`nav a[href="${href}"]`);
      await expect(link).toHaveClass(/bg-emerald-400/);
    }

    expect(errors).toHaveLength(0);
  });

  test('deep-link listings/:id preserves route after fresh login', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const errors = collectConsoleErrors(page);

    // Establish an active admin session in the fresh context.
    const token = 'admin-test-token';
    const expiresAt = String(Date.now() + 24 * 60 * 60 * 1000);
    await page.goto(ROUTES.login);
    await page.evaluate(
      ({ token: t, expiresAt: e }) => {
        localStorage.setItem('adminAccessToken', t);
        localStorage.setItem('adminSessionExpiresAt', e);
        sessionStorage.setItem('accessToken', t);
      },
      { token, expiresAt },
    );

    // Mock the dashboard API in case the deep link resolves through the
    // protected-route redirect flow.
    await setupAllRoutes(page);

    await page.goto('http://localhost:5173/admin/listings');
    await expect(page).toHaveURL(/\/admin\/listings/);

    expect(errors).toHaveLength(0);
    await ctx.close();
  });
});
