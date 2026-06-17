# PocketTrade Mobile

Flutter Android client for PocketTrade.

## Current Features

- Email OTP login.
- Browse, search, filter, and sort listings.
- Multi-photo listing creation with backend enum values: `brand_new`, `like_new`, `excellent`, `good`, `fair`.
- Listing details with gallery, sold badge, favorite, report, and message seller actions.
- Saved listings, conversations, chat, profile editing, seller listing actions, and logout.

## Run

```bash
flutter pub get
flutter run --dart-define=API_URL=http://10.0.2.2:3000
```

Use `10.0.2.2` for an Android emulator pointed at a backend running on the host.

## Build

```bash
flutter analyze
flutter build apk --debug --dart-define=API_URL=https://your-api.example.com
```

## API Surface

- `POST /auth/request-otp` with `{ "email": "user@example.com" }`
- `POST /auth/verify-otp` with `{ "email": "user@example.com", "code": "123456" }`
- `POST /auth/logout`
- `GET /listings`, `GET /listings/:id`, `POST /listings` with multipart `photos`
- `GET /listings/mine`, `PATCH /listings/:id`, `DELETE /listings/:id`, `POST /listings/:id/mark-sold`, `POST /listings/:id/republish`
- `GET/POST/DELETE /favorites`
- `GET/POST /conversations`, `GET/POST /conversations/:id/messages`
- `POST /reports`, `POST /blocks/:userId`, `POST /push-tokens`
