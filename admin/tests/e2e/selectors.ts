/**
 * Shared Playwright selectors for the PocketTrade admin panel.
 *
 * Every selector here was extracted from the actual admin app source
 * (see the exploration report that fed this file). When the app's UI
 * changes, update these selectors and the spec files together.
 *
 * Conventions:
 *   - Strings ending in `Sel` are CSS selectors.
 *   - Strings ending in `Text` are visible text used by `getByText`.
 *   - Strings ending in `Role` are used with `getByRole({ name: ... })`.
 *   - Functions are preferred for selectors that need to disambiguate
 *     between identical labels (e.g. multiple "Prev" buttons).
 */

export const APP_BASENAME = '/admin' as const;

export const SEL = {
  // ─── Login ────────────────────────────────────────────────────────────
  login: {
    /** Absolute URL of the login page. */
    formUrl: '/admin/login',
    emailInput: '#email',
    passwordInput: '#password',
    submitButtonRole: 'Sign In', // button text; also "Signing in..." while loading
    errorBanner:
      'div.bg-red-50.text-red-700.border-red-200',
  },

  // ─── Layout / sidebar / nav ───────────────────────────────────────────
  layout: {
    /** Sidebar NavLinks — order matches the sidebar render order. */
    navLinks: [
      { path: '/dashboard', label: 'Overview' },
      { path: '/listings', label: 'Listings' },
      { path: '/users', label: 'Users' },
      { path: '/reports', label: 'Reports' },
      { path: '/analytics', label: 'Search analytics' },
      { path: '/activity', label: 'Activity log' },
    ] as const,
    /** Active link gets react-router's `aria-current="page"`. */
    activeNavLink: 'a[aria-current="page"]',
    /** Sidebar nav container; useful for "sidebar is visible" assertions. */
    sidebarNav: 'nav',
    /** Primary "Log out" trigger in the sidebar. */
    logoutButton: 'button:has(span:text-is("Log out"))',
    /** Inline confirmation overlay's "Log out" confirm button. */
    logoutConfirmButton:
      'button:has-text("Log out"):not(:has(span))',
    /** Cancel button in any modal/inline-overlay (text "Cancel"). */
    cancelButton: 'button:text-is("Cancel")',
  },

  // ─── Dashboard ────────────────────────────────────────────────────────
  dashboard: {
    /** Loading skeleton has aria-label="Loading dashboard". */
    loadingSkeleton: '[aria-label="Loading dashboard"]',
    /** Bar chart container — has aria-label. */
    barChart: '[aria-label="Bar chart showing listings by status"]',
    /** Metric card labels (the four cards). */
    metricCardLabels: {
      needsReview: 'Needs review',
      openReports: 'Open reports',
      liveInventory: 'Live inventory',
      activeMembers: 'Active members',
    } as const,
    errorBanner:
      'div.rounded-lg.bg-red-50.text-red-800.border-red-200',
  },

  // ─── Listings ─────────────────────────────────────────────────────────
  listings: {
    tableSel: 'table.admin-table',
    statusFilter: 'select.admin-filter >> nth=0',
    brandFilter: 'select.admin-filter >> nth=1',
    /** Approve / Reject / Edit / Remove / Restore — button text. */
    approveButton: 'button:has-text("Approve")',
    rejectButton: 'button:has-text("Reject")',
    editButton: 'button:has-text("Edit")',
    removeButton: 'button:has-text("Remove")',
    restoreButton: 'button:has-text("Restore")',
    modalTitles: {
      reject: 'Reject listing',
      editPrice: 'Edit price',
    } as const,
    modalHeadingSel:
      'div.fixed.inset-0 div.admin-surface h2',
    modalReasonInput: 'div.fixed.inset-0 div.admin-surface input[type="text"]',
    modalPriceInput: 'div.fixed.inset-0 div.admin-surface input[type="number"]',
    modalSaveButton: 'div.fixed.inset-0 div.admin-surface button:text-is("Save")',
    emptyStateText: 'No listings found',
    errorBanner:
      'div.bg-red-50.text-red-700.border-red-200',
    pagination: {
      prev: 'button:has-text("Prev")',
      next: 'button:has-text("Next")',
    },
  },

  // ─── Users ────────────────────────────────────────────────────────────
  users: {
    tableSel: 'table.admin-table',
    statusFilter: 'select.admin-filter >> nth=0',
    suspendButton: 'button:has-text("Suspend")',
    restoreButton: 'button:has-text("Restore")',
    modalTitles: {
      suspend: 'Suspend user',
      restore: 'Restore user',
    } as const,
    modalReasonInput: 'div.fixed.inset-0 div.admin-surface input[type="text"]',
    modalConfirmButton:
      'div.fixed.inset-0 div.admin-surface button:text-is("Confirm")',
    emptyStateText: 'No users found',
    errorBanner:
      'div.bg-red-50.text-red-700.border-red-200',
    pagination: {
      prev: 'button:has-text("Prev")',
      next: 'button:has-text("Next")',
    },
  },

  // ─── Reports ──────────────────────────────────────────────────────────
  reports: {
    cardListSel: '.overflow-hidden.rounded-lg.border.bg-white.divide-y',
    cardSel: 'div.grid.gap-3.p-4',
    statusFilter: 'select.admin-filter >> nth=0',
    resolveButton: 'button:has-text("Resolve")',
    dismissButton: 'button:has-text("Dismiss")',
    emptyStateText: 'No reports',
    errorBanner:
      'div.rounded-md.bg-red-50.text-red-700.border-red-200',
    pagination: {
      prev: 'button:has-text("Previous")',
      next: 'button:has-text("Next")',
    },
  },

  // ─── Analytics ────────────────────────────────────────────────────────
  analytics: {
    topTermsHeading: 'h2:has-text("Top Terms")',
    topTermsChart: '.recharts-wrapper',
    zeroResultsHeading: 'h2:has-text("Zero-result Searches")',
    zeroResultsEmptyText: 'No zero-result searches',
    errorBanner:
      'div.rounded-md.bg-red-50.text-red-700.border-red-200',
  },

  // ─── Activity ─────────────────────────────────────────────────────────
  activity: {
    timelineList: 'div.divide-y.bg-white',
    emptyStateText: 'No activity yet',
    errorBanner:
      'div.rounded-md.bg-red-50.text-red-700.border-red-200',
    pagination: {
      prev: 'button:has-text("Previous")',
      next: 'button:has-text("Next")',
    },
  },
} as const;

/**
 * Absolute URLs for the admin app, given the configured baseURL.
 * Useful for direct deep-link tests (e.g. c8: /admin/listings/:id
 * preserves route after fresh login).
 */
export const ROUTES = {
  login: '/admin/login',
  dashboard: '/admin/dashboard',
  listings: '/admin/listings',
  users: '/admin/users',
  reports: '/admin/reports',
  analytics: '/admin/analytics',
  activity: '/admin/activity',
} as const;
