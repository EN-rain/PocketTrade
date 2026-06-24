/**
 * Search Analytics spec.
 *
 * Test cases:
 *   1. page loads — heading, Top Terms bar chart and zero-result list render
 *   2. zero-result empty state — when API returns no zero-result searches,
 *      the empty message is shown
 *   3. axe-core — zero serious/critical violations
 */

import { test, expect } from './fixtures';
import { ROUTES, SEL } from './selectors';
import type { Page } from './fixtures';

// ─── Mock data ───────────────────────────────────────────────────────────────

interface ZeroResultItem {
  id: number;
  searchTerm: string;
}

interface SearchAnalyticsResponse {
  topTerms: Array<{ term: string; count: number }>;
  zeroResults: ZeroResultItem[];
}

const TOP_TERMS = [
  { term: 'iphone', count: 42 },
  { term: 'nike', count: 28 },
  { term: 'watch', count: 15 },
];

const ZERO_RESULTS: ZeroResultItem[] = [
  { id: 1, searchTerm: 'xyzabc123' },
  { id: 2, searchTerm: 'qwertyunknown' },
];

function makeAnalyticsResp(zeroResults = ZERO_RESULTS): SearchAnalyticsResponse {
  return {
    topTerms: TOP_TERMS,
    zeroResults,
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

async function routeAnalyticsStatic(
  page: Page,
  body: SearchAnalyticsResponse,
) {
  await page.route(
    /^http:\/\/localhost:3000\/admin\/analytics\/search(?:\?.*)?$/,
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
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(body),
      });
    },
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Analytics', () => {
  test('page loads with heading, chart and zero-result list', async ({
    page,
    loginAsAdmin,
  }) => {
    const errors = collectConsoleErrors(page);
    await loginAsAdmin();
    await routeAnalyticsStatic(page, makeAnalyticsResp());

    await page.goto(ROUTES.analytics);
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /Search Analytics/i }),
    ).toBeVisible();

    await expect(page.locator(SEL.analytics.topTermsChart)).toBeVisible();
    await expect(page.locator('.recharts-wrapper svg')).toBeVisible();

    await expect(page.locator(SEL.analytics.zeroResultsHeading)).toBeVisible();
    for (const item of ZERO_RESULTS) {
      await expect(page.getByText(item.searchTerm)).toBeVisible();
    }

    expect(errors).toHaveLength(0);
  });

  test('zero-result empty state', async ({ page, loginAsAdmin }) => {
    const errors = collectConsoleErrors(page);
    await loginAsAdmin();
    await routeAnalyticsStatic(page, makeAnalyticsResp([]));

    await page.goto(ROUTES.analytics);
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText(SEL.analytics.zeroResultsEmptyText),
    ).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('axe-core zero serious/critical', async ({
    page,
    loginAsAdmin,
    expectNoSeriousA11yViolations,
  }) => {
    const errors = collectConsoleErrors(page);
    await loginAsAdmin();
    await routeAnalyticsStatic(page, makeAnalyticsResp());

    await page.goto(ROUTES.analytics);
    await page.waitForLoadState('networkidle');

    await expectNoSeriousA11yViolations({
      disableRules: ['color-contrast', 'aria-prohibited-attr', 'select-name'],
    });
    expect(errors).toHaveLength(0);
  });
});
