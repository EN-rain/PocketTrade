# Admin Panel

React + TypeScript + Vite admin dashboard for the PocketTrade.

## Local Development

```bash
npm install
npm run dev
```

Runs on http://localhost:5173.

## Environment Variables

Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

| Variable     | Description                | Default                               |
|--------------|----------------------------|---------------------------------------|
| VITE_API_URL | Base URL of the backend API | `http://localhost:3000` |

> In production, `VITE_API_URL` can be set at build time or fall back to the baked-in default in `src/lib/api.ts`.

## Build

```bash
npm run build
```

Outputs static files to `dist/` which can be deployed to Vercel (auto-detects Vite).

## Features

- **Login** — authenticates against `/admin/auth/login` and stores the access token in localStorage.
- **Dashboard** — metrics cards + bar/pie charts (recharts) showing listing status breakdown + recent activity feed.
- **Listings** — paginated table with status/brand filters, approve/reject actions.
- **Users** — paginated table with account status filter, suspend/restore actions.

## Admin Credentials

Try `admin@example.com` / `admin123`. If that fails, check the backend seed configuration for the actual `ADMIN_BOOTSTRAP_PASSWORD`.
