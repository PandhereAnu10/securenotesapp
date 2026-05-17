CREATE TABLE IF NOT EXISTS "public"."notes" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "is_pinned" BOOLEAN NOT NULL DEFAULT false,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notes_user_id_idx" ON "public"."notes"("user_id");

DO $$ BEGIN
  ALTER TABLE "public"."notes"
    ADD CONSTRAINT "notes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "public"."note_shares" (
  "id" TEXT NOT NULL,
  "note_id" TEXT NOT NULL,
  "shared_with_user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "note_shares_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "note_shares_note_id_shared_with_user_id_key"
  ON "public"."note_shares"("note_id", "shared_with_user_id");

DO $$ BEGIN
  ALTER TABLE "public"."note_shares"
    ADD CONSTRAINT "note_shares_note_id_fkey"
    FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."note_shares"
    ADD CONSTRAINT "note_shares_shared_with_user_id_fkey"
    FOREIGN KEY ("shared_with_user_id") REFERENCES "public"."users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
