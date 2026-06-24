/**
 * Responsive layout spec — Chromium only.
 *
 * Verifies that every protected admin page renders without horizontal
 * overflow and without clipped controls at three viewport sizes:
 *   - mobile  (375x812)
 *   - tablet  (768x1024)
 *   - desktop (1280x800)
 *
 * A single authenticated session and a single set of mock API routes are
 * reused for the whole matrix to keep the test fast and deterministic.
 */

import { test, expect } from './fixtures';
import { ROUTES } from './selectors';
import type { Page, TestInfo } from '@playwright/test';

// ─── Viewports ───────────────────────────────────────────────────────────────

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
] as const;

// ─── Pages under test ────────────────────────────────────────────────────────

const PAGES = [
  ROUTES.dashboard,
  ROUTES.listings,
  ROUTES.users,
  ROUTES.reports,
  ROUTES.analytics,
  ROUTES.activity,
] as const;

// ─── Mock payloads ───────────────────────────────────────────────────────────

const MOCK_ROUTES = {
  'GET /admin/dashboard': {
    body: {
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
      recentListings: [
        {
          id: '1',
          brand: 'Canon',
          model: 'EOS R5',
          price: 2499,
          status: 'active',
          createdAt: '2025-01-01T00:00:00Z',
        },
      ],
      recentActivity: [
        {
          type: 'listing_reviewed',
          description: 'Listing #1 approved',
          createdAt: '2025-01-01T00:00:00Z',
        },
      ],
    },
  },
  'GET /admin/listings': {
    body: {
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
    },
  },
  'GET /admin/users': {
    body: {
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
    },
  },
  'GET /admin/reports': {
    body: {
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
    },
  },
  'GET /admin/analytics/search': {
    body: {
      topTerms: [
        { term: 'iphone', count: 42 },
        { term: 'nike', count: 28 },
      ],
      zeroResults: [{ id: 1, searchTerm: 'xyzabc123' }],
    },
  },
  'GET /admin/activity': {
    body: {
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
    },
  },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Wait for the page to reach networkidle, then assert that the root
 * element has no horizontal overflow.
 */
async function expectNoHorizontalOverflow(page: Page) {
  await page.waitForLoadState('networkidle');
  const hasOverflow = await page.evaluate(() => {
    return (
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth
    );
  });
  expect(hasOverflow, 'Page has horizontal overflow').toBe(false);
}

/**
 * Assert that a representative interactive element for the route is
 * visible and not clipped.
 */
async function expectControlsVisible(page: Page, route: string) {
  switch (route) {
    case ROUTES.dashboard: {
      // Metric cards are the primary actionable content on the dashboard.
      const metricCard = page
        .locator('a', { hasText: 'Needs review' })
        .first();
      await expect(metricCard, 'Dashboard metric card is visible').toBeVisible();
      break;
    }
    case ROUTES.listings: {
      // The status filter and at least one table row should be visible.
      await expect(
        page.locator('select.admin-filter').first(),
        'Listings status filter is visible',
      ).toBeVisible();
      await expect(
        page.locator('table.admin-table tbody tr').first(),
        'Listings table row is visible',
      ).toBeVisible();
      break;
    }
    case ROUTES.users: {
      await expect(
        page.locator('select.admin-filter').first(),
        'Users status filter is visible',
      ).toBeVisible();
      await expect(
        page.locator('table.admin-table tbody tr').first(),
        'Users table row is visible',
      ).toBeVisible();
      break;
    }
    case ROUTES.reports: {
      await expect(
        page.locator('select.admin-filter').first(),
        'Reports status filter is visible',
      ).toBeVisible();
      await expect(
        page.locator('button:has-text("Resolve")').first(),
        'Reports resolve button is visible',
      ).toBeVisible();
      break;
    }
    case ROUTES.analytics: {
      await expect(
        page.getByRole('heading', { name: 'Top Terms' }).first(),
        'Analytics Top Terms heading is visible',
      ).toBeVisible();
      await expect(
        page.locator('.recharts-wrapper').first(),
        'Analytics chart is visible',
      ).toBeVisible();
      break;
    }
    case ROUTES.activity: {
      await expect(
        page.getByRole('heading', { name: 'Activity Log' }).first(),
        'Activity Log heading is visible',
      ).toBeVisible();
      await expect(
        page.locator('button:has-text("Previous")').first(),
        'Activity pagination button is visible',
      ).toBeVisible();
      break;
    }
    default: {
      throw new Error(`Unknown route: ${route}`);
    }
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Responsive layout', () => {
  test('all protected admin pages render without horizontal overflow or clipped controls', async ({
    page,
    loginAsAdmin,
    mockAdminApi,
  }, testInfo: TestInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Responsive layout tests run only on Chromium',
    );

    await loginAsAdmin();
    await mockAdminApi(MOCK_ROUTES);

    for (const viewport of VIEWPORTS) {
      await test.step(`viewport: ${viewport.name} (${viewport.width}x${viewport.height})`, async () => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });

        for (const route of PAGES) {
          await test.step(`page: ${route}`, async () => {
            await page.goto(route);
            await expectNoHorizontalOverflow(page);
            await expectControlsVisible(page, route);
          });
        }
      });
    }
  });
});
