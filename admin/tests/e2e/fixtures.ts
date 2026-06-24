/**
 * Playwright fixtures and helpers for the PocketTrade admin panel.
 *
 * This module re-exports a custom `test` and `expect` extended with three
 * project-specific fixtures:
 *
 *   - `loginAsAdmin`           : authenticate via storage injection or UI
 *   - `mockAdminApi`           : intercept + fulfill API responses
 *   - `expectNoSeriousA11yViolations` : axe-core check, fails on serious/critical
 *
 * Spec files should `import { test, expect } from './fixtures'` and use
 * `test()` exactly like base Playwright, with these extra fixtures available.
 *
 * The default admin credentials here MUST match `ADMIN_BOOTSTRAP_EMAIL` /
 * `ADMIN_BOOTSTRAP_PASSWORD` seeded by `scripts/qa.ps1`.
 */

import { test as base, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { SEL } from './selectors';

// ─── Constants ─────────────────────────────────────────────────────────

/** localStorage key for the admin JWT. */
const LS_TOKEN_KEY = 'adminAccessToken';
/** localStorage key for the session expiry epoch (ms). */
const LS_EXPIRES_KEY = 'adminSessionExpiresAt';
/** sessionStorage key the axios interceptor actually reads. */
const SS_TOKEN_KEY = 'accessToken';
/** sessionStorage key consumed by App.tsx consumeAdminEntryToken(). */
const SS_ENTRY_TOKEN_KEY = 'pockettrade-admin-entry-token';
/** URL query param consumed by App.tsx consumeAdminEntryToken(). */
const ENTRY_QUERY_KEY = 'entry';

/** Default admin credentials (matches qa.ps1 ADMIN_BOOTSTRAP_*). */
export const ADMIN_TEST_EMAIL = 'admin@pockettrade.local';
export const ADMIN_TEST_PASSWORD = 'AdminPass123!';

/**
 * Backend base URL. Must match `VITE_API_URL` used by `src/lib/api.ts`.
 * Used by `mockAdminApi` to scope page.route() intercepts to the API
 * server only — without this scoping, a glob like `*` (double-star) +
 * `/admin/dashboard` would also match the Vite dev server's HTML route
 * at `http://localhost:5173/admin/dashboard` and return JSON instead of
 * the React shell.
 */
export const ADMIN_API_BASE = 'http://localhost:3000';

// ─── Public types ──────────────────────────────────────────────────────

/** A route spec is keyed by `"METHOD /admin/..."` (e.g. `"GET /admin/users"`). */
export type ApiRouteSpec = {
  status?: number;
  body?: unknown;
  /** Optional delay before responding (ms). Useful for loading-state tests. */
  delayMs?: number;
  /** Optional explicit content-type. Defaults to application/json. */
  contentType?: string;
};

export type ApiRouteMap = Record<string, ApiRouteSpec>;

export type LoginAsAdminOptions = {
  email?: string;
  password?: string;
  /**
   * If true, drive the real UI login form (slower; for auth-flow tests).
   * If false (default), inject tokens into localStorage/sessionStorage so
   * the next navigation is already authenticated.
   */
  viaForm?: boolean;
  /**
   * When false, do NOT inject localStorage adminAccessToken / expiresAt.
   * The entry-token guard still passes (so the page renders), but
   * ProtectedRoute will reject because there's no admin session.
   * Default: true (full session).
   */
  withSession?: boolean;
};

export type A11yCheckOptions = {
  /** axe rule ids to skip (e.g. `['color-contrast']` for known design gaps). */
  disableRules?: string[];
  /** CSS selectors to exclude from the scan (e.g. third-party widgets). */
  excludeSelectors?: string[];
  /** axe tags to include. Default: WCAG 2.0 A + AA. */
  tags?: string[];
};

// ─── Fixtures ──────────────────────────────────────────────────────────

export type Fixtures = {
  loginAsAdmin: (opts?: LoginAsAdminOptions) => Promise<void>;
  mockAdminApi: (routes: ApiRouteMap) => Promise<void>;
  expectNoSeriousA11yViolations: (opts?: A11yCheckOptions) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  /**
   * Authenticate the current page. Default mode injects a synthetic token
   * into the same storage keys the real app uses (see `src/pages/Login.tsx`
   * and `src/lib/api.ts`). Use `viaForm: true` for the auth-flow spec.
   */
  loginAsAdmin: async ({ page }, use) => {
    await use(async (opts: LoginAsAdminOptions = {}) => {
      const email = opts.email ?? ADMIN_TEST_EMAIL;
      const password = opts.password ?? ADMIN_TEST_PASSWORD;

      if (opts.viaForm) {
        await page.goto(SEL.login.formUrl);
        await page.locator(SEL.login.emailInput).fill(email);
        await page.locator(SEL.login.passwordInput).fill(password);
        await page
          .getByRole('button', { name: SEL.login.submitButtonRole })
          .click();
        await page.waitForURL(/\/admin\/dashboard$/);
        return;
      }

      // Storage-injection path: pre-populate the keys the axios interceptor
      // reads (sessionStorage.accessToken) plus the localStorage keys the
      // login flow itself writes. Also seed the entry-token in
      // sessionStorage + augment the URL with ?entry=<token> so App.tsx's
      // canEnterAdmin guard passes for /admin/* routes even when navigating
      // directly to /admin/login (which is otherwise outside the React
      // Router's session-gated subtree). The token value doesn't need to be
      // a valid JWT — the axios layer just checks `if (token) ...`.
      const token = `e2e-test-token-${Date.now().toString(36)}`;
      const entryToken = `e2e-entry-${Date.now().toString(36)}`;
      const expiresAt = String(Date.now() + 24 * 60 * 60 * 1000);
      const withSession = opts.withSession !== false;

      await page.addInitScript(
        ({
          token,
          entryToken,
          expiresAt,
          lsKey,
          lsExpiresKey,
          ssKey,
          ssEntryKey,
          entryQueryKey,
          withSession,
        }) => {
          try {
            sessionStorage.setItem(ssEntryKey, entryToken);
            if (withSession) {
              localStorage.setItem(lsKey, token);
              localStorage.setItem(lsExpiresKey, expiresAt);
              sessionStorage.setItem(ssKey, token);
            }
            // Mirror the entry token into the URL so App.tsx's
            // consumeAdminEntryToken() can match against sessionStorage.
            const url = new URL(window.location.href);
            if (!url.searchParams.has(entryQueryKey)) {
              url.searchParams.set(entryQueryKey, entryToken);
              window.history.replaceState({}, '', url.toString());
            }
          } catch {
            /* storage may be unavailable in private mode — surface in test */
          }
        },
        {
          token,
          entryToken,
          expiresAt,
          lsKey: LS_TOKEN_KEY,
          lsExpiresKey: LS_EXPIRES_KEY,
          ssKey: SS_TOKEN_KEY,
          ssEntryKey: SS_ENTRY_TOKEN_KEY,
          entryQueryKey: ENTRY_QUERY_KEY,
          withSession,
        },
      );
    });
  },

  /**
   * Intercept requests matching the route map and fulfill with the given
   * response. Match format: `"METHOD /admin/path"` → ApiRouteSpec.
   * Routes are scoped to the API server's base URL (ADMIN_API_BASE) so
   * that the Vite dev server's HTML route (also at `/admin/dashboard`)
   * is NOT intercepted.
   *
   * CORS preflights (OPTIONS) are short-circuited with a permissive 204
   * so the browser doesn't block the real request waiting on a backend
   * that isn't running.
   *
   * Example:
   *   await mockAdminApi({
   *     'GET /admin/users':    { body: { users: [] } },
   *     'POST /admin/auth/login': { status: 401, body: { error: 'Bad creds' } },
   *   });
   */
  mockAdminApi: async ({ page }, use) => {
    await use(async (routes: ApiRouteMap) => {
      // Regex anchored to ADMIN_API_BASE so Vite's HTML route at the same
      // path on :5173 is not intercepted.
      const baseRe = ADMIN_API_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      for (const [key, spec] of Object.entries(routes)) {
        const [method, ...pathParts] = key.split(/\s+/);
        const path = pathParts.join(' ');
        const url = new RegExp(`^${baseRe}${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\?.*)?$`);
        await page.route(url, async (route) => {
          const req = route.request();
          // CORS preflight: short-circuit with permissive headers.
          if (req.method() === 'OPTIONS') {
            await route.fulfill({
              status: 204,
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers':
                  'Content-Type, Authorization, X-Requested-With',
              },
            });
            return;
          }
          if (method && req.method() !== method.toUpperCase()) {
            await route.continue();
            return;
          }
          if (spec.delayMs && spec.delayMs > 0) {
            await new Promise((r) => setTimeout(r, spec.delayMs));
          }
          await route.fulfill({
            status: spec.status ?? 200,
            contentType: spec.contentType ?? 'application/json',
            headers: {
              'Access-Control-Allow-Origin': '*',
            },
            body:
              typeof spec.body === 'string'
                ? spec.body
                : JSON.stringify(spec.body ?? {}),
          });
        });
      }
    });
  },

  /**
   * Run axe-core on the current page and throw if any serious or critical
   * violations are found. Inline in every page spec (not a separate spec).
   *
   * Uses WCAG 2.0 A + AA tags by default. Pass `disableRules` for known
   * false positives (e.g. `['color-contrast']` for design system gaps).
   */
  expectNoSeriousA11yViolations: async ({ page }, use) => {
    await use(async (opts: A11yCheckOptions = {}) => {
      let builder = new AxeBuilder({ page }).withTags(
        opts.tags ?? ['wcag2a', 'wcag2aa'],
      );
      if (opts.disableRules?.length) {
        builder = builder.disableRules(opts.disableRules);
      }
      if (opts.excludeSelectors?.length) {
        for (const sel of opts.excludeSelectors) {
          builder = builder.exclude(sel);
        }
      }
      const results = await builder.analyze();
      const blockers = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      if (blockers.length > 0) {
        const lines = blockers
          .map(
            (v) =>
              `  - ${v.id} [${v.impact}] ${v.help} (${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'})\n    ${v.helpUrl}`,
          )
          .join('\n');
        throw new Error(
          `Found ${blockers.length} serious/critical accessibility violation${blockers.length === 1 ? '' : 's'}:\n${lines}`,
        );
      }
    });
  },
});

// Re-export the base expect so spec files don't import from '@playwright/test'.
export { expect };
export type { Page };
