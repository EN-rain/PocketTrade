-- Invalidate all previously issued JWTs when a user's security state changes.
ALTER TABLE "users"
ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;
