import { test, expect } from './fixtures';
import { ROUTES } from './selectors';

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
      recentListings: [],
      recentActivity: [],
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
          reason: 'Inappropriate',
          details: 'User posted offensive language',
          status: 'pending',
          reporter: { email: 'r@example.com' },
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
      topTerms: [{ term: 'iphone', count: 42 }],
      zeroResults: [{ id: 1, searchTerm: 'xyz' }],
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
};

test.describe('Visual baselines', () => {
  test('dashboard baseline screenshot', async ({ page, loginAsAdmin, mockAdminApi }) => {
    await loginAsAdmin();
    await mockAdminApi(MOCK_ROUTES);
    await page.goto(ROUTES.dashboard);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('dashboard.png', { fullPage: true });
  });

  test('listings baseline screenshot', async ({ page, loginAsAdmin, mockAdminApi }) => {
    await loginAsAdmin();
    await mockAdminApi(MOCK_ROUTES);
    await page.goto(ROUTES.listings);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('listings.png', { fullPage: true });
  });

  test('users baseline screenshot', async ({ page, loginAsAdmin, mockAdminApi }) => {
    await loginAsAdmin();
    await mockAdminApi(MOCK_ROUTES);
    await page.goto(ROUTES.users);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('users.png', { fullPage: true });
  });

  test('reports baseline screenshot', async ({ page, loginAsAdmin, mockAdminApi }) => {
    await loginAsAdmin();
    await mockAdminApi(MOCK_ROUTES);
    await page.goto(ROUTES.reports);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('reports.png', { fullPage: true });
  });

  test('analytics baseline screenshot', async ({ page, loginAsAdmin, mockAdminApi }) => {
    await loginAsAdmin();
    await mockAdminApi(MOCK_ROUTES);
    await page.goto(ROUTES.analytics);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('analytics.png', { fullPage: true });
  });

  test('activity baseline screenshot', async ({ page, loginAsAdmin, mockAdminApi }) => {
    await loginAsAdmin();
    await mockAdminApi(MOCK_ROUTES);
    await page.goto(ROUTES.activity);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('activity.png', { fullPage: true });
  });
});
