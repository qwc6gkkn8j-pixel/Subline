-- Migration: add staffMemberId to Appointment
-- Created: 2026-05-08

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "staffMemberId" TEXT;

CREATE INDEX IF NOT EXISTS "Appointment_staffMemberId_idx" ON "Appointment"("staffMemberId");
