# PocketTrade Deployment

## Backend

Deploy `backend/` to a Node.js host with PostgreSQL access.

Build and start commands:

```bash
cd backend
npm ci
npx prisma generate
npm run build
npx prisma migrate deploy
npm run seed
npm run start
```

Required environment values:

```env
DATABASE_URL=
JWT_SECRET=
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
# Comma-separated list of HTTPS origins allowed to call this API.
# Include every deployed frontend (web + admin + future apps).
CORS_ORIGINS=https://your-admin-domain.example,https://pocket-trade-eight.vercel.app
TRUST_PROXY=1
ADMIN_BOOTSTRAP_EMAIL=
ADMIN_BOOTSTRAP_PASSWORD=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

`CORS_ORIGINS` must list **every** frontend origin that talks to this
API. If a deployed frontend is missing from this list, browsers will
block requests with a CORS error and login/register will fail. Do **not**
use `*` in production — the backend refuses it.

Email delivery for OTP verification and password reset:

```env
MAILJET_API_KEY=
MAILJET_API_SECRET=
MAILJET_FROM_EMAIL=verified_sender@example.com
MAILJET_FROM_NAME=PocketTrade
```

Push notifications:

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

`JWT_SECRET` is required in every non-test environment and must contain at least 32 characters. Use `NODE_ENV=production`, HTTPS, and the correct trusted reverse-proxy hop count in production.

Health and API docs:

```text
GET /health
GET /api-docs
```

### Free-tier keep-alive

Render spins a Free web service down after **15 minutes without inbound
traffic** (HTTP or WebSocket messages). The next request cold-starts it in
about a minute. To keep it warm, send it traffic from somewhere that is not
the service itself.

**No Render API key is required.** The Render API cannot wake a sleeping
service any faster than a normal request can, and `/health` is public.
`HEALTH_CHECK_DB=false` (in the Dockerfile) makes the ping answer instantly
without waking Neon.

Pick one of these:

1. **External uptime monitor — simplest, no code.**
   Use [cron-job.org](https://cron-job.org) or UptimeRobot (both free):
   URL `https://pockettrade-ebaq.onrender.com/health`, interval 5 minutes,
   timeout 120 seconds, method GET, alert when the status is not `200`.
   Runs off your machine and does not depend on GitHub Actions.

2. **Cloudflare Worker cron — free, code in this repo.**
   `keepalive/cloudflare-worker/` contains a Worker with a 5-minute cron
   trigger. Deploy it once (needs a free Cloudflare account):

   ```bash
   cd keepalive/cloudflare-worker
   npx wrangler login
   npx wrangler deploy
   ```

3. **Local fallback — only while your PC is on.**
   `scripts/keepalive.ps1` pings the health URL once; register it every
   5 minutes with `scripts/install-keepalive-task.ps1` (Windows Task
   Scheduler). Stop it with `Unregister-ScheduledTask -TaskName
   "PocketTrade Keepalive"`.

4. **Paid instance — no cold starts at all.**
   Render Starter (~$7/month) never spins down. Delete any pinger after
   upgrading so it does not burn hours pointlessly.

Free workspaces get **750 instance-hours/month**. One always-on service uses
roughly 730, so do not keep a second Free web service awake in the same
workspace — if the quota runs out, Render suspends all Free web services until
the next month.

## Web app (`web/`)

Deploy `web/` to Vercel or any static host that runs `vite build`.

```bash
cd web
npm ci
npm run build
```

**Required build-time variable** (Vercel → Settings → Environment Variables,
Production scope):

```env
VITE_API_URL=https://your-api-domain.example
```

This value is inlined into the bundle at build time, so a missing or
wrong variable will silently break `/login`, `/register`, and every
authenticated request. The app now refuses to build/boot in production
when `VITE_API_URL` is unset — if you see a build error referencing
`VITE_API_URL`, set the variable in Vercel and redeploy. Do **not**
commit `web/.env`; configure it in the host instead.

The build output is written to `web/dist/`.

## Admin panel

Deploy `admin/` to Vercel or another static host.

```bash
cd admin
npm ci
npm run build
```

Build-time variable:

```env
VITE_API_URL=https://your-api-domain.example
```

The build output is written to `admin/dist/`.

## Android app

Build against the deployed API:

```bash
cd mobile
flutter pub get
flutter analyze
flutter build apk --release --dart-define=API_URL=https://your-api-domain.example
```

For Play Store release:

```bash
flutter build appbundle --release --dart-define=API_URL=https://your-api-domain.example
```

Configure Android signing before producing a release build. Copy `mobile/android/key.properties.example` to `mobile/android/key.properties`, point it to a private upload keystore, and keep both files out of Git. Release builds now fail when signing is missing.

## Deployment order

1. Create the PostgreSQL database.
2. Deploy the backend environment values, including a `CORS_ORIGINS`
   list that contains every frontend origin you ship (web + admin).
3. Run Prisma migrations.
4. Seed the administrator and development data only when required.
5. Deploy the admin panel with the backend URL.
6. Deploy the web app with the backend URL, configured as
   `VITE_API_URL` in the host's environment variables.
7. Build the Android app with the same backend URL.
8. Test registration, login, email OTP verification/reset, image
   upload, chat, moderation, and push notifications.

## Security notes

- Do not commit `.env` files or service credentials.
- `CORS_ORIGINS` must list every deployed frontend origin; never use
  `*` in production.
- Rotate any credential that appears in logs or Git history.
- Do not run development seed data in production unless it is intentional.
- Use HTTPS for the backend, admin panel, and OAuth or email-provider callbacks.
