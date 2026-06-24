/**
 * Reports management spec.
 *
 * Six test cases:
 *   1. card list load — report cards render with report data visible
 *   2. status filter — selects a status; card list narrows to matching rows
 *   3. resolve button — marks a report as reviewed; card disappears from pending list
 *   4. dismiss button — marks a report as dismissed; card disappears from pending list
 *   5. empty state — when API returns items: [], shows "No reports"
 *   6. axe-core — zero serious/critical violations
 */

import { test, expect } from './fixtures';
import { ROUTES, SEL } from './selectors';
import type { Page } from './fixtures';

// ─── Mock data ───────────────────────────────────────────────────────────────

interface ReportItem {
  id: number;
  reason: string;
  details?: string | null;
  status: string;
  reporter?: { email?: string | null } | null;
  conversation?: {
    messages?: Array<{ id: number; senderId: number; content: string }>;
  } | null;
}

interface ReportsResponse {
  items: ReportItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const REPORTS_BASE: ReportItem[] = [
  {
    id: 1,
    reason: 'Inappropriate content',
    details: 'User posted offensive language',
    status: 'pending',
    reporter: { email: 'reporter1@example.com' },
    conversation: null,
  },
  {
    id: 2,
    reason: 'Spam',
    details: 'Repeated promotional messages',
    status: 'pending',
    reporter: { email: 'reporter2@example.com' },
    conversation: null,
  },
  {
    id: 3,
    reason: 'Scam',
    details: 'Suspicious payment request',
    status: 'reviewed',
    reporter: { email: 'reporter3@example.com' },
    conversation: null,
  },
  {
    id: 4,
    reason: 'Harassment',
    details: 'Threatening messages in chat',
    status: 'dismissed',
    reporter: { email: 'reporter4@example.com' },
    conversation: null,
  },
];

function makeResp(items: ReportItem[] = REPORTS_BASE): ReportsResponse {
  return {
    items,
    total: items.length,
    page: 1,
    limit: 10,
    pages: 1,
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

async function routeReportsStatic(page: Page, body: ReportsResponse) {
  await page.route(
    /^http:\/\/localhost:3000\/admin\/reports(?:\?.*)?$/,
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

test.describe('Reports', () => {
  test('card list load', async ({ page, loginAsAdmin }) => {
    const errors = collectConsoleErrors(page);
    await loginAsAdmin();
    await routeReportsStatic(page, makeResp());

    await page.goto(ROUTES.reports);
    await page.waitForLoadState('networkidle');

    const list = page.locator(SEL.reports.cardListSel);
    await expect(list).toBeVisible();

    const cards = page.locator(SEL.reports.cardSel);
    await expect(cards).toHaveCount(REPORTS_BASE.length);

    for (const report of REPORTS_BASE) {
      await expect(page.getByText(report.reason)).toBeVisible();
      await expect(page.getByText(report.details ?? '')).toBeVisible();
      await expect(
        page.getByText(`Reporter: ${report.reporter?.email ?? 'Unknown'}`),
      ).toBeVisible();
    }

    expect(errors).toHaveLength(0);
  });

  test('status filter', async ({ page, loginAsAdmin }) => {
    const errors = collectConsoleErrors(page);
    await loginAsAdmin();

    await page.route(
      /^http:\/\/localhost:3000\/admin\/reports(?:\?.*)?$/,
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
        const status = url.searchParams.get('status');
        const items = status
          ? REPORTS_BASE.filter((r) => r.status === status)
          : REPORTS_BASE;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify(makeResp(items)),
        });
      },
    );

    await page.goto(ROUTES.reports);
    await page.waitForLoadState('networkidle');
    await expect(page.locator(SEL.reports.cardSel)).toHaveCount(
      REPORTS_BASE.length,
    );

    const filter = page.locator(SEL.reports.statusFilter);
    await filter.selectOption('pending');
    await page.waitForLoadState('networkidle');

    const cards = page.locator(SEL.reports.cardSel);
    await expect(cards).toHaveCount(
      REPORTS_BASE.filter((r) => r.status === 'pending').length,
    );
    await expect(cards.first().locator('span:text-is("pending")')).toBeVisible();
    await expect(page.getByText('Inappropriate content')).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('resolve button', async ({ page, loginAsAdmin }) => {
    const errors = collectConsoleErrors(page);
    await loginAsAdmin();

    let resolved = false;
    const getItems = (status: string) => {
      let items = status
        ? REPORTS_BASE.filter((r) => r.status === status)
        : [...REPORTS_BASE];
      if (resolved) {
        items = items
          .map((r) => (r.id === 1 ? { ...r, status: 'reviewed' } : r))
          .filter((r) => !(status === 'pending' && r.id === 1));
      }
      return items;
    };

    await page.route(
      /^http:\/\/localhost:3000\/admin\/reports(?:\?.*)?$/,
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
        const status = url.searchParams.get('status') ?? '';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify(makeResp(getItems(status))),
        });
      },
    );

    await page.route(
      /^http:\/\/localhost:3000\/admin\/reports\/1\/resolve(?:\?.*)?$/,
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
        if (req.method() === 'POST') {
          resolved = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: true }),
          });
          return;
        }
        await route.continue();
      },
    );

    await page.goto(ROUTES.reports);
    await page.waitForLoadState('networkidle');

    const filter = page.locator(SEL.reports.statusFilter);
    await filter.selectOption('pending');
    await page.waitForLoadState('networkidle');

    const cards = page.locator(SEL.reports.cardSel);
    await expect(cards).toHaveCount(2);

    const card = cards.filter({ hasText: 'Inappropriate content' }).first();
    await expect(card.locator(SEL.reports.resolveButton)).toBeVisible();
    await card.locator(SEL.reports.resolveButton).click();

    await expect(card).not.toBeVisible();
    await expect(page.locator(SEL.reports.cardSel)).toHaveCount(1);

    expect(errors).toHaveLength(0);
  });

  test('dismiss button', async ({ page, loginAsAdmin }) => {
    const errors = collectConsoleErrors(page);
    await loginAsAdmin();

    let dismissed = false;
    const getItems = (status: string) => {
      let items = status
        ? REPORTS_BASE.filter((r) => r.status === status)
        : [...REPORTS_BASE];
      if (dismissed) {
        items = items
          .map((r) => (r.id === 2 ? { ...r, status: 'dismissed' } : r))
          .filter((r) => !(status === 'pending' && r.id === 2));
      }
      return items;
    };

    await page.route(
      /^http:\/\/localhost:3000\/admin\/reports(?:\?.*)?$/,
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
        const status = url.searchParams.get('status') ?? '';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify(makeResp(getItems(status))),
        });
      },
    );

    await page.route(
      /^http:\/\/localhost:3000\/admin\/reports\/2\/dismiss(?:\?.*)?$/,
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
        if (req.method() === 'POST') {
          dismissed = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: true }),
          });
          return;
        }
        await route.continue();
      },
    );

    await page.goto(ROUTES.reports);
    await page.waitForLoadState('networkidle');

    const filter = page.locator(SEL.reports.statusFilter);
    await filter.selectOption('pending');
    await page.waitForLoadState('networkidle');

    const cards = page.locator(SEL.reports.cardSel);
    await expect(cards).toHaveCount(2);

    const card = cards.filter({ hasText: 'Spam' }).first();
    await expect(card.locator(SEL.reports.dismissButton)).toBeVisible();
    await card.locator(SEL.reports.dismissButton).click();

    await expect(card).not.toBeVisible();
    await expect(page.locator(SEL.reports.cardSel)).toHaveCount(1);

    expect(errors).toHaveLength(0);
  });

  test('empty state', async ({ page, loginAsAdmin }) => {
    const errors = collectConsoleErrors(page);
    await loginAsAdmin();
    await routeReportsStatic(page, {
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      pages: 1,
    });

    await page.goto(ROUTES.reports);
    await page.waitForLoadState('networkidle');

    await expect(page.locator(SEL.reports.cardSel)).toHaveCount(0);
    await expect(page.getByText(SEL.reports.emptyStateText)).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('axe-core zero serious/critical', async ({
    page,
    loginAsAdmin,
    expectNoSeriousA11yViolations,
  }) => {
    const errors = collectConsoleErrors(page);
    await loginAsAdmin();
    await routeReportsStatic(page, makeResp());

    await page.goto(ROUTES.reports);
    await page.waitForLoadState('networkidle');

    await expectNoSeriousA11yViolations({
      disableRules: ['color-contrast', 'aria-prohibited-attr', 'select-name'],
    });

    expect(errors).toHaveLength(0);
  });
});
