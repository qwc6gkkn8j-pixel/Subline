-- Migration: add staffMemberId to Appointment
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "staffMemberId" TEXT;
CREATE INDEX IF NOT EXISTS "Appointment_staffMemberId_idx" ON "Appointment"("staffMemberId");
