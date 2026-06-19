-- PocketTrade uses email-only OTP authentication.
-- Remove the legacy mobile-number field and its indexes from users.

DROP INDEX IF EXISTS "users_mobile_number_idx";
DROP INDEX IF EXISTS "users_mobile_number_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "mobile_number";
