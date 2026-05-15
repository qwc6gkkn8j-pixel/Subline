-- Migration: features v3 — ProStatus, ClientSegment, Favorite, discovery fields, language, category
-- All statements are idempotent (IF NOT EXISTS / DO NOTHING).

-- ── New enums ──────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "ProStatus" AS ENUM ('pending_onboarding', 'active', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ClientSegment" AS ENUM ('vip', 'mensal', 'ocasional', 'inativo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── User ──────────────────────────────────────────────────────────────────

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "language"  VARCHAR(5) NOT NULL DEFAULT 'fr';

-- ── Barber ────────────────────────────────────────────────────────────────

ALTER TABLE "Barber" ADD COLUMN IF NOT EXISTS "proStatus"   "ProStatus" NOT NULL DEFAULT 'active';
ALTER TABLE "Barber" ADD COLUMN IF NOT EXISTS "categories"  TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Barber" ADD COLUMN IF NOT EXISTS "city"        TEXT;
ALTER TABLE "Barber" ADD COLUMN IF NOT EXISTS "country"     TEXT NOT NULL DEFAULT 'LU';

-- ── Client ────────────────────────────────────────────────────────────────

ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "segment"          "ClientSegment";
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "segmentUpdatedAt" TIMESTAMP(3);

-- ── StaffMember ───────────────────────────────────────────────────────────

ALTER TABLE "StaffMember" ADD COLUMN IF NOT EXISTS "category" TEXT;

-- ── Favorite (new table) ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Favorite" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "barberId"  TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Favorite_userId_barberId_key" ON "Favorite"("userId", "barberId");
CREATE INDEX IF NOT EXISTS "Favorite_userId_idx"   ON "Favorite"("userId");
CREATE INDEX IF NOT EXISTS "Favorite_barberId_idx" ON "Favorite"("barberId");

ALTER TABLE "Favorite" DROP CONSTRAINT IF EXISTS "Favorite_userId_fkey";
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Favorite" DROP CONSTRAINT IF EXISTS "Favorite_barberId_fkey";
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_barberId_fkey"
    FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE CASCADE ON UPDATE CASCADE;
