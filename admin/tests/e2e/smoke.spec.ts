/**
 * Smoke spec — proves the fixtures module loads, the test runner can
 * discover tests under tests/e2e/, and each custom fixture is callable.
 *
 * This file is intentionally tiny. Real per-page specs land in phase 2:
 *   - tests/e2e/auth.spec.ts        (c2)
 *   - tests/e2e/dashboard.spec.ts   (c3)
 *   - tests/e2e/listings.spec.ts    (c4)
 *   - tests/e2e/users.spec.ts       (c5)
 *   - tests/e2e/reports.spec.ts     (c6)
 *   - tests/e2e/analytics.spec.ts   (c7)
 *   - tests/e2e/activity.spec.ts    (c7)
 *   - tests/e2e/navigation.spec.ts  (c8)
 *   - tests/e2e/responsive.spec.ts  (c9)
 */

import { test, expect } from './fixtures';
import { ROUTES, SEL } from './selectors';

test.describe('fixtures smoke', () => {
  test('loginAsAdmin fixture is callable and injects storage tokens', async ({
    page,
    loginAsAdmin,
  }) => {
    expect(typeof loginAsAdmin).toBe('function');
    // Inject tokens, then load a page and verify they're present.
    await loginAsAdmin();
    await page.goto(ROUTES.login);
    const lsToken = await page.evaluate(() =>
      localStorage.getItem('adminAccessToken'),
    );
    const ssToken = await page.evaluate(() =>
      sessionStorage.getItem('accessToken'),
    );
    expect(lsToken, 'localStorage adminAccessToken should be set').toBeTruthy();
    expect(ssToken, 'sessionStorage accessToken should be set').toBeTruthy();
    expect(lsToken).toBe(ssToken);
  });

  test('mockAdminApi fixture is callable', async ({ mockAdminApi }) => {
    expect(typeof mockAdminApi).toBe('function');
    // No-op call to prove the fixture wires up cleanly.
    await mockAdminApi({});
  });

  test('expectNoSeriousA11yViolations fixture is callable', async ({
    page,
    expectNoSeriousA11yViolations,
  }) => {
    expect(typeof expectNoSeriousA11yViolations).toBe('function');
    // Run against a real (blank) page so axe executes end-to-end.
    await page.goto('about:blank');
    await expectNoSeriousA11yViolations();
  });

  test('selectors module exports SEL and ROUTES', async () => {
    expect(SEL.login.emailInput).toBe('#email');
    expect(SEL.login.passwordInput).toBe('#password');
    expect(SEL.layout.navLinks).toHaveLength(6);
    expect(ROUTES.login).toBe('/admin/login');
    expect(ROUTES.dashboard).toBe('/admin/dashboard');
  });
});
