# PocketTrade

PocketTrade is a used-phone PocketTrade with a NestJS backend, React admin panel, and Flutter Android app.

## Stack

- Backend: NestJS, Prisma, PostgreSQL, JWT, Resend email OTP, Cloudinary, Socket.IO, Firebase Admin for FCM.
- Admin: React 19, Vite, TypeScript, Tailwind, Recharts.
- Mobile: Flutter, GoRouter, Dio, secure token storage.

## Local Setup

```bash
cd backend
npm install
cp ../.env.example .env
npx prisma migrate deploy
npm run seed
npm run start:dev
```

```bash
cd admin
npm install
echo VITE_API_URL=http://localhost:3000 > .env
npm run dev
```

```bash
cd mobile
flutter pub get
flutter run --dart-define=API_URL=http://10.0.2.2:3000
```

## Backend Environment

Required:

- `DATABASE_URL`
- `JWT_SECRET`
- `CLOUDINARY_URL` or `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`
- `ADMIN_BOOTSTRAP_EMAIL`
- `ADMIN_BOOTSTRAP_PASSWORD`

Feature providers:

- `RESEND_API_KEY`
- `OTP_FROM_EMAIL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

## API Highlights

- Auth: `POST /auth/request-otp`, `POST /auth/verify-otp`, `POST /auth/refresh`, `POST /auth/logout`
- Users: `GET /users/me`, `PATCH /users/me`, `POST /users/me/delete-request`
- Listings: public search/detail, authenticated multi-photo create, seller lifecycle actions.
- PocketTrade: favorites, conversations/messages, blocks, reports, push tokens.
- Admin: dashboard, listings, users, reports, search analytics, activity log.
- Docs: Swagger UI at `/api-docs`.

## Verification

```bash
cd backend && npm test && npm run build
cd admin && npm run build
cd mobile && flutter analyze && flutter build apk --debug
```

Flutter commands require the Flutter SDK on PATH.
