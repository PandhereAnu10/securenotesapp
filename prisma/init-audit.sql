DROP TABLE IF EXISTS "public"."note_audit_ledger" CASCADE;

CREATE TABLE "public"."note_audit_ledger" (
  "id" TEXT NOT NULL,
  "note_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "actor_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "note_audit_ledger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "note_audit_ledger_note_id_idx" ON "public"."note_audit_ledger"("note_id");

ALTER TABLE "public"."note_audit_ledger"
  ADD CONSTRAINT "note_audit_ledger_note_id_fkey"
  FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."note_audit_ledger"
  ADD CONSTRAINT "note_audit_ledger_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
