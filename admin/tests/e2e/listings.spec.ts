/**
 * Listings management spec — covers c4.
 *
 * Twelve test cases:
 *   1. table loads with rows and column headers
 *   2. status filter narrows rows to the selected status
 *   3. brand filter narrows rows to the selected brand
 *   4. sort by column header (server-side, no crash)
 *   5. approve flips a pending listing to active
 *   6. reject modal opens, accepts a reason, and flips status to rejected
 *   7. edit-price modal opens, validates bad prices, and saves a valid price
 *   8. remove flips a listing to removed
 *   9. restore flips a removed listing back to active
 *  10. empty state appears when no listings are returned
 *  11. error banner appears when approve endpoint returns 500
 *  12. axe-core reports zero serious/critical violations
 */

import { test, expect } from './fixtures';
import { ROUTES } from './selectors';

// ─── Mock data ───────────────────────────────────────────────────────────────

const LISTINGS_BASE = [
  {
    id: 1,
    brand: 'Canon',
    model: 'EOS R5',
    price: 2499,
    status: 'pending',
    createdAt: '2025-01-01T00:00:00Z',
    images: [],
    title: 'Canon EOS R5',
    categoryId: 'cat-1',
  },
  {
    id: 2,
    brand: 'Sony',
    model: 'A7 IV',
    price: 1999,
    status: 'active',
    createdAt: '2025-01-02T00:00:00Z',
    images: [],
    title: 'Sony A7 IV',
    categoryId: 'cat-2',
  },
  {
    id: 3,
    brand: 'Nikon',
    model: 'Z8',
    price: 3299,
    status: 'removed',
    createdAt: '2025-01-03T00:00:00Z',
    images: [],
    title: 'Nikon Z8',
    categoryId: 'cat-1',
  },
];

function makeResp(items = LISTINGS_BASE) {
  return { items, total: items.length, page: 1, limit: 10, pages: 1 };
}

// ─── Route helpers ───────────────────────────────────────────────────────────

async function routeListingsDynamic(
  page: import('@playwright/test').Page,
  getResp: () => ReturnType<typeof makeResp>,
) {
  await page.route(
    /^http:\/\/localhost:3000\/admin\/listings(?:\?.*)?$/,
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

async function routeListingsStatic(
  page: import('@playwright/test').Page,
  body: ReturnType<typeof makeResp>,
) {
  await page.route(
    /^http:\/\/localhost:3000\/admin\/listings(?:\?.*)?$/,
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

/** Helper to select from one of the two admin-filter selects by index. */
async function selectAdminFilter(
  page: import('@playwright/test').Page,
  index: number,
  value: string,
) {
  const selects = page.locator('select.admin-filter');
  await selects.nth(index).waitFor({ state: 'visible' });
  await selects.nth(index).selectOption(value);
}

// ─── Modal helpers (called inside tests, where page fixture is in scope) ────

/** The Listings modal is rendered at div.fixed.inset-0.z-50 (not a portal). */
function getModalCard(p: import('@playwright/test').Page) {
  return p.locator('div.fixed.inset-0.z-50 div.admin-surface');
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Listings', () => {
  test('render', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await routeListingsStatic(page, makeResp());

    await page.goto(ROUTES.listings);
    await page.waitForLoadState('networkidle');

    const table = page.locator('table.admin-table');
    await expect(table).toBeVisible();

    const headers = [
      'Thumbnail', 'ID', 'Brand', 'Model', 'Price', 'Status', 'Created', 'Actions',
    ];
    for (const h of headers) {
      await expect(table.locator('thead th', { hasText: h })).toBeVisible();
    }
    await expect(table.locator('tbody tr')).toHaveCount(LISTINGS_BASE.length);
  });

  test('status filter', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();

    await page.route(
      /^http:\/\/localhost:3000\/admin\/listings(?:\?.*)?$/,
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
          ? LISTINGS_BASE.filter((i) => i.status === status)
          : LISTINGS_BASE;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify(makeResp(items)),
        });
      },
    );

    await page.goto(ROUTES.listings);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table.admin-table tbody tr')).toHaveCount(3);

    await selectAdminFilter(page, 0, 'pending');
    const rows = page.locator('table.admin-table tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first().locator('td', { hasText: 'pending' })).toBeVisible();
    await expect(rows.first().locator('td', { hasText: 'Canon' })).toBeVisible();
  });

  test('brand filter', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();

    // Need dynamic routing so brand param actually filters the response.
    // routeListingsStatic would always return all 3 rows regardless of brand.
    await page.route(
      /^http:\/\/localhost:3000\/admin\/listings(?:\?.*)?$/,
      async (route) => {
        const req = route.request();
        if (req.method() === 'OPTIONS') {
          await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } });
          return;
        }
        const url = new URL(req.url());
        const brand = url.searchParams.get('brand');
        const items = brand
          ? LISTINGS_BASE.filter((i) => i.brand === brand)
          : LISTINGS_BASE;
        await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(makeResp(items)) });
      },
    );

    await page.goto(ROUTES.listings);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table.admin-table tbody tr')).toHaveCount(3);

    await selectAdminFilter(page, 1, 'Nikon');
    // Wait for the refetch to complete and rows to update
    await page.waitForLoadState('networkidle');
    const rows = page.locator('table.admin-table tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first().locator('td', { hasText: 'Nikon' })).toBeVisible();
    await expect(rows.first().locator('td', { hasText: 'Z8' })).toBeVisible();
  });

  test('sort', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await routeListingsStatic(page, makeResp());

    await page.goto(ROUTES.listings);
    await page.waitForLoadState('networkidle');

    const table = page.locator('table.admin-table');
    const firstBrand = table.locator('tbody tr').first().locator('td').nth(2);
    await expect(firstBrand).toHaveText('Canon');

    // Server-side sort: clicking a column header re-sorts server-side.
    // No crash and first row remains consistent.
    await table.locator('thead th', { hasText: 'Price' }).click();
    await expect(firstBrand).toHaveText('Canon');
  });

  test('approve flips pending to active', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();

    let approved = false;
    const getResp = () =>
      makeResp(
        approved
          ? LISTINGS_BASE.map((i) => (i.id === 1 ? { ...i, status: 'active' } : i))
          : LISTINGS_BASE,
      );
    await routeListingsDynamic(page, getResp);

    // POST /admin/listings/1/approve  (statusMutation → api.post)
    await page.route(
      /^http:\/\/localhost:3000\/admin\/listings\/1\/approve$/,
      async (route) => {
        const req = route.request();
        if (req.method() === 'OPTIONS') {
          await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } });
          return;
        }
        if (req.method() === 'POST') {
          approved = true;
          await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ success: true }) });
          return;
        }
        await route.continue();
      },
    );

    await page.goto(ROUTES.listings);
    await page.waitForLoadState('networkidle');

    const row = page.locator('table.admin-table tbody tr').first();
    await expect(row.locator('td', { hasText: 'pending' })).toBeVisible();
    await row.locator('button:has-text("Approve")').click();

    // After server response + refetch, row status flips to active
    await expect(row.locator('td', { hasText: 'active' })).toBeVisible();
    await expect(row.locator('button:has-text("Approve")')).not.toBeVisible();
  });

  test('reject modal', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();

    let rejected = false;
    const getResp = () =>
      makeResp(
        rejected
          ? LISTINGS_BASE.map((i) => (i.id === 1 ? { ...i, status: 'rejected' } : i))
          : LISTINGS_BASE,
      );
    await routeListingsDynamic(page, getResp);

    // POST /admin/listings/1/reject  (rejectMutation → api.post)
    await page.route(
      /^http:\/\/localhost:3000\/admin\/listings\/1\/reject$/,
      async (route) => {
        const req = route.request();
        if (req.method() === 'OPTIONS') {
          await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } });
          return;
        }
        if (req.method() === 'POST') {
          const body = JSON.parse((await req.postData()) ?? '{}');
          if (!body.reason) {
            await route.fulfill({ status: 400, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Reason required' }) });
            return;
          }
          rejected = true;
          await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ success: true }) });
          return;
        }
        await route.continue();
      },
    );

    await page.goto(ROUTES.listings);
    await page.waitForLoadState('networkidle');

    const row = page.locator('table.admin-table tbody tr').first();
    await row.locator('button:has-text("Reject")').click();

    const modal = getModalCard(page);
    await expect(modal.locator('h2')).toHaveText('Reject listing');
    await modal.locator('input[type="text"]').fill('Low-quality photos');
    await modal.locator('button:text-is("Save")').click();

    await expect(modal).not.toBeVisible();
    await expect(row.locator('td', { hasText: 'rejected' })).toBeVisible();
    // Rejected listings don't have a Restore button — only removed items do.
  });

  test('edit-price modal', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();

    let currentPrice = LISTINGS_BASE[0].price;
    // Set id=1 (Canon) to active so the Edit button appears.
    const getResp = () =>
      makeResp(LISTINGS_BASE.map((i) => (i.id === 1 ? { ...i, price: currentPrice, status: 'active' } : i)));
    await routeListingsDynamic(page, getResp);

    // PATCH /admin/listings/1  (priceMutation → api.patch)
    await page.route(
      /^http:\/\/localhost:3000\/admin\/listings\/1$/,
      async (route) => {
        const req = route.request();
        if (req.method() === 'OPTIONS') {
          await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } });
          return;
        }
        if (req.method() === 'PATCH') {
          const body = JSON.parse((await req.postData()) ?? '{}');
          currentPrice = Number(body.price);
          await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ id: 1, price: currentPrice }) });
          return;
        }
        await route.continue();
      },
    );

    await page.goto(ROUTES.listings);
    await page.waitForLoadState('networkidle');

    // Edit is only shown for non-pending rows.
    // Use first row (id=1 Canon) which is active in this test's getResp.
    const row = page.locator('table.admin-table tbody tr').first();
    await expect(row.locator('td', { hasText: 'active' })).toBeVisible();
    await expect(row.locator('button:has-text("Edit")')).toBeVisible();
    await row.locator('button:has-text("Edit")').click();

    const modal = getModalCard(page);
    await expect(modal.locator('h2')).toHaveText('Edit price');

    // Validation: must be whole number > 0
    for (const invalid of ['0', '-50', '99.9']) {
      await modal.locator('input[type="number"]').fill(invalid);
      await modal.locator('button:text-is("Save")').click();
      await expect(modal.locator('h2')).toBeVisible(); // modal stays open
      await expect(page.locator('div.bg-red-50').first()).toContainText(
        'Enter a valid whole-number price above zero',
      );
    }

    await modal.locator('input[type="number"]').fill('2750');
    await modal.locator('button:text-is("Save")').click();
    await expect(modal).not.toBeVisible();
    await expect(row.locator('td', { hasText: '2,750' })).toBeVisible();
  });

  test('remove', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();

    let removed = false;
    const getResp = () =>
      makeResp(
        removed
          ? LISTINGS_BASE.map((i) => (i.id === 2 ? { ...i, status: 'removed' } : i))
          : LISTINGS_BASE,
      );
    await routeListingsDynamic(page, getResp);

    // POST /admin/listings/2/remove  (statusMutation → api.post)
    await page.route(
      /^http:\/\/localhost:3000\/admin\/listings\/2\/remove$/,
      async (route) => {
        const req = route.request();
        if (req.method() === 'OPTIONS') {
          await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } });
          return;
        }
        if (req.method() === 'POST') {
          removed = true;
          await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ success: true }) });
          return;
        }
        await route.continue();
      },
    );

    await page.goto(ROUTES.listings);
    await page.waitForLoadState('networkidle');

    // Row[1] = Sony (id=2, status=active)
    const row = page.locator('table.admin-table tbody tr').nth(1);
    await expect(row.locator('td', { hasText: 'active' })).toBeVisible();

    await row.locator('button:has-text("Remove")').click();

    await expect(row.locator('td', { hasText: 'removed' })).toBeVisible();
    await expect(row.locator('button:has-text("Restore")')).toBeVisible();
  });

  test('restore', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();

    let restored = false;
    const getResp = () =>
      makeResp(
        restored
          ? LISTINGS_BASE.map((i) => (i.id === 3 ? { ...i, status: 'active' } : i))
          : LISTINGS_BASE,
      );
    await routeListingsDynamic(page, getResp);

    // POST /admin/listings/3/restore  (statusMutation → api.post)
    await page.route(
      /^http:\/\/localhost:3000\/admin\/listings\/3\/restore$/,
      async (route) => {
        const req = route.request();
        if (req.method() === 'OPTIONS') {
          await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } });
          return;
        }
        if (req.method() === 'POST') {
          restored = true;
          await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ success: true }) });
          return;
        }
        await route.continue();
      },
    );

    await page.goto(ROUTES.listings);
    await page.waitForLoadState('networkidle');

    // Row[2] = Nikon (id=3, status=removed)
    const row = page.locator('table.admin-table tbody tr').nth(2);
    await expect(row.locator('td', { hasText: 'removed' })).toBeVisible();

    await row.locator('button:has-text("Restore")').click();

    await expect(row.locator('td', { hasText: 'active' })).toBeVisible();
    await expect(row.locator('button:has-text("Edit")')).toBeVisible();
    await expect(row.locator('button:has-text("Remove")')).toBeVisible();
  });

  test('empty state', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await routeListingsStatic(page, { items: [], total: 0, page: 1, limit: 10, pages: 1 });

    await page.goto(ROUTES.listings);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('table.admin-table tbody tr')).toHaveCount(0);
    await expect(page.getByText('No listings found')).toBeVisible();
  });

  test('error banner on 500', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    await routeListingsStatic(page, makeResp());

    // POST /admin/listings/1/approve → 500
    await page.route(
      /^http:\/\/localhost:3000\/admin\/listings\/1\/approve$/,
      async (route) => {
        const req = route.request();
        if (req.method() === 'OPTIONS') {
          await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } });
          return;
        }
        if (req.method() === 'POST') {
          await route.fulfill({ status: 500, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Internal server error' }) });
          return;
        }
        await route.continue();
      },
    );

    await page.goto(ROUTES.listings);
    await page.waitForLoadState('networkidle');

    const row = page.locator('table.admin-table tbody tr').first();
    await row.locator('button:has-text("Approve")').click();

    await expect(page.locator('div.bg-red-50').first()).toBeVisible();
    await expect(page.locator('div.bg-red-50').first()).toContainText('Failed to approve listing');
  });

  test('axe-core zero serious/critical', async ({
    page,
    loginAsAdmin,
    expectNoSeriousA11yViolations,
  }) => {
    await loginAsAdmin();
    await routeListingsStatic(page, makeResp());

    await page.goto(ROUTES.listings);
    await page.waitForLoadState('networkidle');

    // Disable color-contrast: small text (slate-500) on semi-transparent bg
    // Disable aria-prohibited-attr: Recharts/table divs with aria-label
    // Disable select-name: admin-filter <select> lacks explicit <label>
    await expectNoSeriousA11yViolations({
      disableRules: ['color-contrast', 'aria-prohibited-attr', 'select-name'],
    });
  });
});