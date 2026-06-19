# PocketTrade Admin

React and TypeScript admin panel for PocketTrade.

## Stack

- React
- TypeScript
- Vite
- React Router
- Axios
- Tailwind CSS
- Recharts

## Requirements

- Node.js
- npm
- Running PocketTrade backend

## Setup

```bash
npm install
```

Copy the environment example:

```bash
cp .env.example .env
```

Windows Command Prompt:

```cmd
copy .env.example .env
```

Set the backend URL:

```env
VITE_API_URL=http://localhost:3000
```

Run locally:

```bash
npm run dev
```

Default URL:

```text
http://localhost:5173
```

## Authentication

The login page calls:

```text
POST /admin/auth/login
```

Administrator credentials are created by the backend seed using `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD`. No default password is stored in this project documentation.

## Pages

- Dashboard
- Listings
- Users
- Reports
- Search analytics
- Activity logs

## API client

The shared Axios client is located at:

```text
src/lib/api.ts
```

Protected routes are handled by:

```text
src/components/ProtectedRoute.tsx
```

## Checks

```bash
npm run lint
npm run build
```

Build output:

```text
dist/
```

## Deployment

Deploy `dist/` to a static host or connect the project to Vercel. Set `VITE_API_URL` during the production build.

The backend must allow the deployed admin origin through `CORS_ORIGINS`.
