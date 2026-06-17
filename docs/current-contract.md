# Current Contract

PocketTrade now targets email-only OTP auth, multi-photo listings, seller listing management, favorites, reports, conversations/messages, admin analytics/activity logs, Swagger at `/api-docs`, and push-token registration for FCM.

```text
POST /auth/request-otp        { email }
POST /auth/verify-otp         { email, code }
POST /auth/logout             { refreshToken }
POST /listings                multipart photos[] + listing fields
GET  /listings/mine
PATCH /listings/:id
DELETE /listings/:id
POST /listings/:id/mark-sold
POST /listings/:id/republish
GET/POST /conversations
GET/POST /conversations/:id/messages
POST /reports
POST /push-tokens
GET  /admin/analytics/search
GET  /admin/activity
GET  /api-docs
```

Required new env vars are `RESEND_API_KEY`, `OTP_FROM_EMAIL`, and optional Firebase Admin values `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.
