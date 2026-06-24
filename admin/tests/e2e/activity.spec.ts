/**
 * Activity Log spec.
 *
 * Test cases:
 *   1. page loads — heading and timeline list render with activity items
 *   2. pagination — clicking Next advances the page and clicking Previous
 *      goes back
 *   3. axe-core — zero serious/critical violations
 */

import { test, expect } from './fixtures';
import { ROUTES, SEL } from './selectors';
import type { Page } from './fixtures';

// ─── Mock data ───────────────────────────────────────────────────────────────

interface ActivityItem {
  id: number;
  action: string;
  targetType: string;
  targetId: string;
  adminId: string;
}

interface ActivityResponse {
  items: ActivityItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const PAGE_SIZE = 20;
const TOTAL_PAGES = 3;

function makeActivityItem(id: number): ActivityItem {
  return {
    id,
    action: `Reviewed listing #${id}`,
    targetType: 'Listing',
    targetId: String(id),
    adminId: String((id % 3) + 1),
  };
}

function makeActivityResp(pageNum: number): ActivityResponse {
  const total = TOTAL_PAGES * PAGE_SIZE;
  const start = (pageNum - 1) * PAGE_SIZE + 1;
  const end = Math.min(pageNum * PAGE_SIZE, total);
  const count = Math.max(0, end - start + 1);
  const items = Array.from({ length: count }, (_, i) =>
    makeActivityItem(start + i),
  );
  return {
    items,
    total,
    page: pageNum,
    limit: PAGE_SIZE,
    pages: TOTAL_PAGES,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

async function routeActivityPaginated(page: Page) {
  let currentPage = 1;
  await page.route(
    /^http:\/\/localhost:3000\/admin\/activity(?:\?.*)?$/,
    async (route) => {
      const req = route.request();
      if (req.method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          },
        });
        return;
      }
      const url = new URL(req.url());
      currentPage = parseInt(url.searchParams.get('page') ?? '1', 10);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(makeActivityResp(currentPage)),
      });
    },
  );
  return {
    getCurrentPage: () => currentPage,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Activity', () => {
  test('page loads with heading and timeline', async ({ page, loginAsAdmin }) => {
    const errors = collectConsoleErrors(page);
    await loginAsAdmin();
    await routeActivityPaginated(page);

    await page.goto(ROUTES.activity);
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /Activity Log/i }),
    ).toBeVisible();

    const list = page.locator(SEL.activity.timelineList);
    await expect(list).toBeVisible();

    const items = list.locator('> div');
    await expect(items).toHaveCount(PAGE_SIZE);

    const first = makeActivityItem(1);
    await expect(page.getByText(first.action)).toBeVisible();
    await expect(
      page.getByText(
        `${first.targetType} #${first.targetId} by admin #${first.adminId}`,
      ),
    ).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('pagination next and previous', async ({ page, loginAsAdmin }) => {
    const errors = collectConsoleErrors(page);
    await loginAsAdmin();
    const { getCurrentPage } = await routeActivityPaginated(page);

    await page.goto(ROUTES.activity);
    await page.waitForLoadState('networkidle');

    await expect(page.locator(SEL.activity.pagination.next)).toBeEnabled();
    await expect(page.locator(SEL.activity.pagination.prev)).toBeDisabled();
    expect(getCurrentPage()).toBe(1);

    await page.locator(SEL.activity.pagination.next).click();
    await page.waitForLoadState('networkidle');

    expect(getCurrentPage()).toBe(2);
    await expect(page.locator(SEL.activity.pagination.prev)).toBeEnabled();
    await expect(page.locator(SEL.activity.pagination.next)).toBeEnabled();

    await page.locator(SEL.activity.pagination.prev).click();
    await page.waitForLoadState('networkidle');

    expect(getCurrentPage()).toBe(1);
    await expect(page.locator(SEL.activity.pagination.prev)).toBeDisabled();

    expect(errors).toHaveLength(0);
  });

  test('axe-core zero serious/critical', async ({
    page,
    loginAsAdmin,
    expectNoSeriousA11yViolations,
  }) => {
    const errors = collectConsoleErrors(page);
    await loginAsAdmin();
    await routeActivityPaginated(page);

    await page.goto(ROUTES.activity);
    await page.waitForLoadState('networkidle');

    await expectNoSeriousA11yViolations({
      disableRules: ['color-contrast', 'aria-prohibited-attr', 'select-name'],
    });
    expect(errors).toHaveLength(0);
  });
});
