DROP TABLE IF EXISTS "public"."note_shares" CASCADE;
DROP TABLE IF EXISTS "public"."notes" CASCADE;

CREATE TABLE "public"."notes" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "is_pinned" BOOLEAN NOT NULL DEFAULT false,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notes_user_id_idx" ON "public"."notes"("user_id");

ALTER TABLE "public"."notes"
  ADD CONSTRAINT "notes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "public"."note_shares" (
  "id" TEXT NOT NULL,
  "note_id" TEXT NOT NULL,
  "shared_with_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "note_shares_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "note_shares_note_id_shared_with_user_id_key"
  ON "public"."note_shares"("note_id", "shared_with_user_id");

ALTER TABLE "public"."note_shares"
  ADD CONSTRAINT "note_shares_note_id_fkey"
  FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."note_shares"
  ADD CONSTRAINT "note_shares_shared_with_user_id_fkey"
  FOREIGN KEY ("shared_with_user_id") REFERENCES "public"."users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
