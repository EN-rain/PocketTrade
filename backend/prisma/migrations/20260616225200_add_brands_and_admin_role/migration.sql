-- Add brands table and admin role fields to users

-- CreateUserRole enum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- Add new columns to users (using DROP NOT NULL + ADD for safe idempotency)
-- email: nullable unique
ALTER TABLE "users" ADD COLUMN "email" TEXT;
ALTER TABLE "users" ADD CONSTRAINT "users_email_key" UNIQUE ("email");

-- password_hash: nullable
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT;

-- role: non-nullable with default 'user'
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'user';

-- Create brands table
CREATE TABLE "brands" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "brands_name_key" ON "brands"("name");
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");