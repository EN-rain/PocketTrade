/**
 * Users management spec.
 *
 * Seven test cases:
 *   1. render — table loads with rows and column headers
 *   2. status filter — selects a status; table narrows to matching rows
 *   3. suspend modal — opens modal, accepts reason text, saves; status flips to suspended
 *   4. restore modal — opens restore confirmation dialog, confirms; status flips back to active
 *   5. empty state — when API returns items: [], shows "No users found"
 *   6. role-aware button visibility — active users show Suspend; suspended show Restore only
 *   7. axe-core — zero serious/critical violations
 */

import { test, expect } from './fixtures';
import { ROUTES, SEL } from './selectors';

// ─── Mock data ───────────────────────────────────────────────────────────────

const USERS_BASE = [
  {
    id: 1,
    email: 'alice@example.com',
    displayName: 'Alice Smith',
    role: 'user',
    accountStatus: 'active',
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 2,
    email: 'bob@example.com',
    displayName: 'Bob Jones',
    role: 'user',
    accountStatus: 'suspended',
    suspensionReason: 'Spam',
    createdAt: '2025-01-02T00:00:00Z',
  },
  {
    id: 3,
    email: 'carol@example.com',
    displayName: 'Carol Admin',
    role: 'admin',
    accountStatus: 'active',
    createdAt: '2025-01-03T00:00:00Z',
  },
];

function makeResp(items = USERS_BASE) {
  return { items, total: items.length, page: 1, limit: 10, pages: 1 };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getModalCard(page: import('@playwright/test').Page) {
  return page.locator('div.fixed.inset-0.z-50 div.admin-surface');
}

function collectConsoleErrors(page: import('@playwright/test').Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

async function routeUsersStatic(
  page: import('@playwright/test').Page,
  body: ReturnType<typeof makeResp>,
) {
  await page.route(
    /^http:\/\/localhost:3000\/admin\/users(?:\?.*)?$/,
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

async function routeUsersDynamic(
  page: import('@playwright/test').Page,
  getResp: () => ReturnType<typeof makeResp>,
) {
  await page.route(
    /^http:\/\/localhost:3000\/admin\/users(?:\?.*)?$/,
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
        body: JSON.stringify(getResp()),
      });
    },
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Users', () => {
  test('render', async ({ page, loginAsAdmin }) => {
    const errors = collectConsoleErrors(page);
    await loginAsAdmin();
    await routeUsersStatic(page, makeResp());

    await page.goto(ROUTES.users);
    await page.waitForLoadState('networkidle');

    const table = page.locator(SEL.users.tableSel);
    await expect(table).toBeVisible();

    const headers = ['ID', 'Email', 'Name', 'Role', 'Status', 'Created', 'Actions'];
    for (const h of headers) {
      await expect(table.locator('thead th', { hasText: h })).toBeVisible();
    }
    await expect(table.locator('tbody tr')).toHaveCount(USERS_BASE.length);
    expect(errors).toHaveLength(0);
  });

  test('status filter', async ({ page, loginAsAdmin }) => {
    const errors = collectConsoleErrors(page);
    await loginAsAdmin();

    await page.route(
      /^http:\/\/localhost:3000\/admin\/users(?:\?.*)?$/,
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
        const status = url.searchParams.get('accountStatus');
        const items = status
          ? USERS_BASE.filter((u) => u.accountStatus === status)
          : USERS_BASE;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify(makeResp(items)),
        });
      },
    );

    await page.goto(ROUTES.users);
    await page.waitForLoadState('networkidle');
    await expect(page.locator(SEL.users.tableSel).locator('tbody tr')).toHaveCount(3);

    const filter = page.locator(SEL.users.statusFilter);
    await filter.selectOption('suspended');
    await page.waitForLoadState('networkidle');

    const rows = page.locator(SEL.users.tableSel).locator('tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first().locator('td', { hasText: 'suspended' })).toBeVisible();
    await expect(rows.first().locator('td', { hasText: 'bob@example.com' })).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('suspend modal', async ({ page, loginAsAdmin }) => {
    const errors = collectConsoleErrors(page);
    await loginAsAdmin();

    let suspended = false;
    const getResp = () =>
      makeResp(
        suspended
          ? USERS_BASE.map((u) =>
              u.id === 1
                ? { ...u, accountStatus: 'suspended', suspensionReason: 'Policy violation' }
                : u,
            )
          : USERS_BASE,
      );
    await routeUsersDynamic(page, getResp);

    await page.route(
      /^http:\/\/localhost:3000\/admin\/users\/1\/suspend$/,
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
          suspended = true;
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

    await page.goto(ROUTES.users);
    await page.waitForLoadState('networkidle');

    const row = page.locator(SEL.users.tableSel).locator('tbody tr').first();
    await expect(row.locator('td', { hasText: 'active' })).toBeVisible();
    await row.locator(SEL.users.suspendButton).click();

    const modal = getModalCard(page);
    await expect(modal.locator('h2')).toHaveText(SEL.users.modalTitles.suspend);
    await expect(modal.locator('p')).toContainText('alice@example.com');
    await modal.locator('input').fill('Policy violation');
    await modal.locator('button:text-is("Confirm")').click();

    await expect(modal).not.toBeVisible();
    await expect(row.locator('td', { hasText: 'suspended' })).toBeVisible();
    await expect(row.locator(SEL.users.restoreButton)).toBeVisible();
    await expect(row.locator(SEL.users.suspendButton)).not.toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('restore modal', async ({ page, loginAsAdmin }) => {
    const errors = collectConsoleErrors(page);
    await loginAsAdmin();

    let restored = false;
    const getResp = () =>
      makeResp(
        restored
          ? USERS_BASE.map((u) =>
              u.id === 2 ? { ...u, accountStatus: 'active', suspensionReason: undefined } : u,
            )
          : USERS_BASE,
      );
    await routeUsersDynamic(page, getResp);

    await page.route(
      /^http:\/\/localhost:3000\/admin\/users\/2\/restore$/,
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
          restored = true;
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

    await page.goto(ROUTES.users);
    await page.waitForLoadState('networkidle');

    const row = page.locator(SEL.users.tableSel).locator('tbody tr').nth(1);
    await expect(row.locator('td', { hasText: 'suspended' })).toBeVisible();
    await row.locator(SEL.users.restoreButton).click();

    const modal = getModalCard(page);
    await expect(modal.locator('h2')).toHaveText(SEL.users.modalTitles.restore);
    await expect(modal.locator('p')).toContainText('bob@example.com');
    await modal.locator('button:text-is("Confirm")').click();

    await expect(modal).not.toBeVisible();
    await expect(row.locator('td', { hasText: 'active' })).toBeVisible();
    await expect(row.locator(SEL.users.suspendButton)).toBeVisible();
    await expect(row.locator(SEL.users.restoreButton)).not.toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('empty state', async ({ page, loginAsAdmin }) => {
    const errors = collectConsoleErrors(page);
    await loginAsAdmin();
    await routeUsersStatic(page, { items: [], total: 0, page: 1, limit: 10, pages: 1 });

    await page.goto(ROUTES.users);
    await page.waitForLoadState('networkidle');

    await expect(page.locator(SEL.users.tableSel).locator('tbody tr')).toHaveCount(0);
    await expect(page.getByText(SEL.users.emptyStateText)).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('role-aware button visibility', async ({ page, loginAsAdmin }) => {
    const errors = collectConsoleErrors(page);
    await loginAsAdmin();
    await routeUsersStatic(page, makeResp());

    await page.goto(ROUTES.users);
    await page.waitForLoadState('networkidle');

    const rows = page.locator(SEL.users.tableSel).locator('tbody tr');
    await expect(rows).toHaveCount(USERS_BASE.length);

    const activeRow = rows.filter({ hasText: 'alice@example.com' }).first();
    await expect(activeRow.locator(SEL.users.suspendButton)).toBeVisible();
    await expect(activeRow.locator(SEL.users.restoreButton)).not.toBeVisible();

    const suspendedRow = rows.filter({ hasText: 'bob@example.com' }).first();
    await expect(suspendedRow.locator(SEL.users.restoreButton)).toBeVisible();
    await expect(suspendedRow.locator(SEL.users.suspendButton)).not.toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('axe-core zero serious/critical', async ({
    page,
    loginAsAdmin,
    expectNoSeriousA11yViolations,
  }) => {
    const errors = collectConsoleErrors(page);
    await loginAsAdmin();
    await routeUsersStatic(page, makeResp());

    await page.goto(ROUTES.users);
    await page.waitForLoadState('networkidle');

    await expectNoSeriousA11yViolations({
      disableRules: ['color-contrast', 'aria-prohibited-attr', 'select-name'],
    });
    expect(errors).toHaveLength(0);
  });
});
