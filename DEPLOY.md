# Deployment Guide

## Backend

Deploy the `backend` service to Render, Docker, or another Node-capable host.

Build/start:

```bash
cd backend
npm install
npx prisma generate
npm run build
npx prisma migrate deploy
npm run seed
npm run start
```

Required env vars:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_ACCESS_TTL=15m`
- `JWT_REFRESH_TTL=30d`
- `CLOUDINARY_URL` or Cloudinary split credentials
- `ADMIN_BOOTSTRAP_EMAIL`
- `ADMIN_BOOTSTRAP_PASSWORD`
- `RESEND_API_KEY`
- `OTP_FROM_EMAIL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

## Admin

Deploy `admin` to Vercel or any static host.

```bash
cd admin
npm install
npm run build
```

Set `VITE_API_URL=https://your-backend.example.com`.

## Mobile

Build Android with the deployed backend URL:

```bash
cd mobile
flutter pub get
flutter build apk --debug --dart-define=API_URL=https://your-backend.example.com
```

For production release, configure Android signing separately and build an app bundle.

## Notes

- Do not commit real Neon, Cloudinary, Resend, Firebase, JWT, Render, or Vercel secrets.
- Swagger is available at `https://your-backend.example.com/api-docs`.
- Render free tier may sleep after inactivity; the first request can be slow.
