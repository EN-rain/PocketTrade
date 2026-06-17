-- Complete PocketTrade feature support: email auth, token revocation, blocking, push tokens, reporting context.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notification_preferences" JSONB;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletion_requested_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspension_reason" TEXT;

UPDATE "users"
SET "email" = CONCAT('user+', "id", '@example.local')
WHERE "email" IS NULL OR "email" = '';

ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "mobile_number" DROP NOT NULL;

ALTER TABLE "otp_requests" ADD COLUMN IF NOT EXISTS "email" TEXT;
UPDATE "otp_requests"
SET "email" = COALESCE("email", CONCAT('legacy+', "mobile_number", '@example.local'))
WHERE "email" IS NULL OR "email" = '';
ALTER TABLE "otp_requests" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "otp_requests" DROP COLUMN IF EXISTS "mobile_number";
CREATE INDEX IF NOT EXISTS "otp_requests_email_idx" ON "otp_requests"("email");

CREATE TABLE IF NOT EXISTS "revoked_refresh_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "revoked_refresh_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "revoked_refresh_tokens_token_hash_key" ON "revoked_refresh_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "revoked_refresh_tokens_user_id_idx" ON "revoked_refresh_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "revoked_refresh_tokens_expires_at_idx" ON "revoked_refresh_tokens"("expires_at");
ALTER TABLE "revoked_refresh_tokens" ADD CONSTRAINT "revoked_refresh_tokens_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "blocked_users" (
    "id" SERIAL NOT NULL,
    "blocker_id" INTEGER NOT NULL,
    "blocked_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "blocked_users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "blocked_users_blocker_id_blocked_id_key" ON "blocked_users"("blocker_id", "blocked_id");
CREATE INDEX IF NOT EXISTS "blocked_users_blocked_id_idx" ON "blocked_users"("blocked_id");
ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_blocker_id_fkey"
FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_blocked_id_fkey"
FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "push_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "device_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "push_tokens_token_key" ON "push_tokens"("token");
CREATE INDEX IF NOT EXISTS "push_tokens_user_id_idx" ON "push_tokens"("user_id");
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "conversation_id" INTEGER;
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "reports_conversation_id_idx" ON "reports"("conversation_id");
ALTER TABLE "reports" ADD CONSTRAINT "reports_conversation_id_fkey"
FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
