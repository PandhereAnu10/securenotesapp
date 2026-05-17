import { z } from "zod";

export const noteIdParamSchema = z.object({
  id: z.string().uuid("Invalid note id"),
});

export const createNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  content: z.string().max(5_000_000).optional().default(""),
});

export const updateNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  content: z.string().max(5_000_000),
});

export const shareNoteSchema = z.object({
  share_with_email: z.string().email("Invalid email address"),
  role: z.enum(["VIEWER", "EDITOR"]).default("VIEWER"),
});

export const pinNoteSchema = z.object({
  pinned: z.boolean(),
});

export const restoreNoteSchema = z.object({
  ledger_id: z.string().uuid("Invalid ledger entry id"),
});
