ALTER TABLE "public"."note_shares"
  ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'VIEWER';

ALTER TABLE "public"."note_shares"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACCEPTED';

UPDATE "public"."note_shares"
SET "status" = 'ACCEPTED'
WHERE "status" IS NULL OR "status" = '';

UPDATE "public"."note_shares"
SET "role" = 'VIEWER'
WHERE "role" IS NULL OR "role" = '';

ALTER TABLE "public"."note_audit_ledger"
  ADD COLUMN IF NOT EXISTS "action" TEXT NOT NULL DEFAULT 'SNAPSHOT';

ALTER TABLE "public"."note_audit_ledger"
  ADD COLUMN IF NOT EXISTS "detail" TEXT;

DO $$ BEGIN
  ALTER TABLE "public"."note_audit_ledger"
    DROP CONSTRAINT IF EXISTS "note_audit_ledger_actor_id_fkey";
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
