/**
 * Auth + security spec — covers c2.
 *
 * Eight test cases:
 *   1. valid admin credentials land on /admin/dashboard
 *   2. invalid credentials show the inline error banner
 *   3. empty submit is blocked by HTML5 validation (required + type=email)
 *   4. logout from the sidebar confirmation overlay returns to /admin/login
 *   5. protected routes redirect to /admin/login when unauthenticated
 *   6. a non-admin (buyer-role) JWT is rejected by /admin/* (mocked 403)
 *   7. a 401 mid-session triggers the axios interceptor's logout+redirect
 *   8. an XSS payload in the email field renders as text, not executed
 *
 * Most flows are driven through the real UI form (the requirement is to
 * exercise the actual user journey), with `mockAdminApi` intercepting the
 * backend so tests don't depend on a running seeded backend.
 *
 * IMPORTANT: the admin app has an entry-token guard at the App.tsx level
 * (`canEnterAdmin = hasActiveAdminSession() || consumeAdminEntryToken()`).
 * To reach /admin/login without an active session, tests must either be
 * logged in OR seed an entry token. The `loginAsAdmin({ withSession: false })`
 * option seeds only the entry token so the form renders without an active
 * admin session. The init script also stamps `?entry=<token>` onto the URL
 * so tests must check the pathname (not the full URL) when asserting
 * navigation targets.
 */

import { test, expect } from './fixtures';
import { ROUTES, SEL } from './selectors';

/** Match URL pathname only (ignores `?entry=` query string). */
const PATHNAME_LOGIN = /\/admin\/login$/;
const PATHNAME_DASHBOARD = /\/admin\/dashboard$/;

/** Strong-typed checker: waits until pathname matches the given regex. */
async function waitForPathname(
  page: import('@playwright/test').Page,
  regex: RegExp,
  timeout = 10_000,
): Promise<void> {
  await page.waitForURL(
    (url) => regex.test(new URL(url).pathname),
    { timeout },
  );
}

/** Asserts the current pathname matches the given regex. */
function expectPathname(
  page: import('@playwright/test').Page,
  regex: RegExp,
): void {
  const pathname = new URL(page.url()).pathname;
  expect(pathname, `pathname was ${pathname}`).toMatch(regex);
}

test.describe('Auth + security', () => {
  test('valid admin credentials land on dashboard', async ({
    page,
    loginAsAdmin,
    mockAdminApi,
  }) => {
    // Seed entry token only — no active session — so the Login form renders.
    await loginAsAdmin({ withSession: false });
    await mockAdminApi({
      'POST /admin/auth/login': {
        status: 200,
        body: {
          accessToken: 'mock-jwt-admin',
          user: {
            id: 'admin-1',
            email: 'admin@pockettrade.local',
            role: 'admin',
          },
        },
      },
      'GET /admin/dashboard': {
        status: 200,
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
    });
    await page.goto(ROUTES.login);
    await page.locator(SEL.login.emailInput).fill('admin@pockettrade.local');
    await page.locator(SEL.login.passwordInput).fill('AdminPass123!');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await waitForPathname(page, PATHNAME_DASHBOARD);
    expectPathname(page, PATHNAME_DASHBOARD);
    const token = await page.evaluate(() =>
      localStorage.getItem('adminAccessToken'),
    );
    expect(token).toBeTruthy();
  });

  test('invalid credentials show inline error banner', async ({
    page,
    loginAsAdmin,
    mockAdminApi,
  }) => {
    await loginAsAdmin({ withSession: false });
    await mockAdminApi({
      'POST /admin/auth/login': {
        status: 401,
        body: { message: 'Invalid email or password' },
      },
    });
    await page.goto(ROUTES.login);
    await page.locator(SEL.login.emailInput).fill('admin@pockettrade.local');
    await page.locator(SEL.login.passwordInput).fill('WrongPass999!');
    await page.getByRole('button', { name: 'Sign In' }).click();
    const banner = page.locator(SEL.login.errorBanner);
    await expect(banner).toBeVisible({ timeout: 5000 });
    await expect(banner).toContainText(/invalid/i);
    expectPathname(page, PATHNAME_LOGIN);
  });

  test('empty submit is blocked by HTML5 validation', async ({
    page,
    loginAsAdmin,
  }) => {
    await loginAsAdmin({ withSession: false });
    await page.goto(ROUTES.login);
    // Wait for the lazy-loaded Login chunk before interacting.
    await expect(page.locator(SEL.login.emailInput)).toBeVisible({
      timeout: 10_000,
    });
    const emailInput = page.locator(SEL.login.emailInput);
    const passwordInput = page.locator(SEL.login.passwordInput);
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');
    await page.getByRole('button', { name: 'Sign In' }).click();
    expectPathname(page, PATHNAME_LOGIN);
    const emailInvalid = await emailInput.evaluate(
      (el: HTMLInputElement) => !el.checkValidity(),
    );
    const passwordInvalid = await passwordInput.evaluate(
      (el: HTMLInputElement) => !el.checkValidity(),
    );
    expect(emailInvalid).toBe(true);
    expect(passwordInvalid).toBe(true);
  });

  test('logout returns to /admin/login', async ({
    page,
    loginAsAdmin,
    mockAdminApi,
  }) => {
    await loginAsAdmin();
    await mockAdminApi({
      'GET /admin/dashboard': {
        status: 200,
        body: {
          metrics: {
            totalUsers: 0,
            totalListings: 0,
            pendingListings: 0,
            activeListings: 0,
            rejectedListings: 0,
            totalReports: 0,
            totalFavorites: 0,
            totalMessages: 0,
          },
          recentListings: [],
          recentActivity: [],
        },
      },
    });
    await page.goto(ROUTES.dashboard);
    // Wait for sidebar to render (lazy-loaded Layout chunk).
    await expect(page.locator('aside')).toBeVisible({ timeout: 10_000 });
    const sidebarLogout = page.locator(
      'aside button:has(span:text-is("Log out"))',
    );
    await expect(sidebarLogout).toBeVisible();
    await sidebarLogout.click();
    const confirmLogout = page.locator(
      'div.fixed.inset-0 button:text-is("Log out")',
    );
    await expect(confirmLogout).toBeVisible({ timeout: 3000 });
    await confirmLogout.click();
    await waitForPathname(page, PATHNAME_LOGIN, 5000);
    expectPathname(page, PATHNAME_LOGIN);
  });

  test('protected routes redirect to /admin/login when unauthenticated', async ({
    page,
    loginAsAdmin,
  }) => {
    await loginAsAdmin({ withSession: false });
    await page.goto(ROUTES.dashboard);
    await waitForPathname(page, PATHNAME_LOGIN, 8000);
    expectPathname(page, PATHNAME_LOGIN);
  });

  test('non-admin (buyer-role) JWT is rejected by /admin/* calls', async ({
    page,
    loginAsAdmin,
    mockAdminApi,
  }) => {
    await loginAsAdmin();
    await mockAdminApi({
      'GET /admin/dashboard': {
        status: 403,
        body: { message: 'Forbidden: admin role required' },
      },
    });
    await page.goto(ROUTES.dashboard);
    const resp = await page.waitForResponse(
      (r) =>
        r.url().includes('/admin/dashboard') && r.status() === 403,
      { timeout: 10_000 },
    );
    expect(resp.status()).toBe(403);
    const banner = page.locator(
      'div.rounded-lg.bg-red-50.text-red-800.border-red-200',
    );
    await expect(banner).toBeVisible({ timeout: 5000 });
  });

  test('401 mid-session triggers logout and redirect', async ({
    page,
    loginAsAdmin,
    mockAdminApi,
  }) => {
    await loginAsAdmin();
    await mockAdminApi({
      'GET /admin/dashboard': {
        status: 401,
        body: { message: 'Session expired' },
      },
    });
    await page.goto(ROUTES.dashboard);
    await waitForPathname(page, PATHNAME_LOGIN);
    expectPathname(page, PATHNAME_LOGIN);
  });

  test('XSS payload in email renders as text and is not executed', async ({
    page,
    loginAsAdmin,
    mockAdminApi,
  }) => {
    let alertFired = false;
    page.on('dialog', async (d) => {
      alertFired = true;
      await d.dismiss();
    });
    await loginAsAdmin({ withSession: false });
    await mockAdminApi({
      'POST /admin/auth/login': {
        status: 400,
        body: { message: 'Bad input: <img src=x onerror=alert(1)>' },
      },
    });
    await page.goto(ROUTES.login);
    await expect(page.locator(SEL.login.emailInput)).toBeVisible({
      timeout: 10_000,
    });
    await page.evaluate(() => {
      const input = document.getElementById('email') as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!;
      setter.call(input, '<img src=x onerror=alert(1)>@x.com');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const form = document.querySelector('form') as HTMLFormElement;
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });
    await page.waitForTimeout(750);
    expect(alertFired, 'XSS alert() should not have fired').toBe(false);
    const injectedImgs = await page.locator('img[onerror]').count();
    expect(injectedImgs).toBe(0);
    const value = await page.locator('#email').inputValue();
    expect(value).toContain('<img');
  });
});
