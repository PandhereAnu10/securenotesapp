import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import { SHARE_ROLE, SHARE_STATUS, type ShareRoleValue, type ShareStatusValue } from "../constants/share";
import { findShareByNoteAndUser } from "./shareDb";

export type AccessLevel = "owner" | "editor" | "viewer" | "none";

export interface NotePermission {
  access: AccessLevel;
  canEdit: boolean;
  note: { id: string; userId: string; title?: string } | null;
  shareId?: string;
  role?: ShareRoleValue;
  status?: ShareStatusValue;
}

export async function getNotePermission(
  noteId: string,
  userId: string
): Promise<NotePermission> {
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: { id: true, userId: true, title: true },
  });

  if (!note) {
    return { access: "none", canEdit: false, note: null };
  }

  if (note.userId === userId) {
    return { access: "owner", canEdit: true, note };
  }

  const share = await findShareByNoteAndUser(noteId, userId);

  if (!share || share.status !== SHARE_STATUS.ACCEPTED) {
    return { access: "none", canEdit: false, note };
  }

  if (share.role === SHARE_ROLE.EDITOR) {
    return {
      access: "editor",
      canEdit: true,
      note,
      shareId: share.id,
      role: share.role as ShareRoleValue,
      status: share.status as ShareStatusValue,
    };
  }

  return {
    access: "viewer",
    canEdit: false,
    note,
    shareId: share.id,
    role: share.role as ShareRoleValue,
    status: share.status as ShareStatusValue,
  };
}

/** @deprecated use getNotePermission */
export async function getNoteAccess(noteId: string, userId: string) {
  const perm = await getNotePermission(noteId, userId);
  const legacy =
    perm.access === "owner"
      ? "owner"
      : perm.access === "editor" || perm.access === "viewer"
        ? "shared"
        : "none";
  return {
    access: legacy as "owner" | "shared" | "none",
    note: perm.note,
  };
}

export function formatNote(
  note: {
    id: string;
    title: string;
    content: string;
    isPinned: boolean;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
  },
  viewerId: string,
  permission?: NotePermission
) {
  const isOwner = note.userId === viewerId;
  const access = permission?.access ?? (isOwner ? "owner" : "none");

  return {
    id: note.id,
    title: note.title,
    content: note.content,
    is_pinned: note.isPinned,
    is_owner: isOwner,
    is_shared: !isOwner && access !== "none",
    can_edit: permission?.canEdit ?? isOwner,
    role: isOwner ? "OWNER" : (permission?.role ?? null),
    share_status: permission?.status ?? null,
    created_at: note.createdAt.toISOString(),
    updated_at: note.updatedAt.toISOString(),
  };
}

export function formatAuditEntry(entry: {
  id: string;
  noteId: string;
  title: string;
  content: string;
  action: string;
  detail: string | null;
  actorId: string;
  createdAt: Date;
  actorEmail: string;
}) {
  return {
    id: entry.id,
    note_id: entry.noteId,
    title: entry.title,
    content: entry.content,
    action: entry.action,
    detail: entry.detail,
    actor_id: entry.actorId,
    actor_email: entry.actorEmail,
    created_at: entry.createdAt.toISOString(),
  };
}

/** Raw insert avoids stale Prisma client missing `action` / `detail` fields. */
export async function appendAuditSnapshot(
  noteId: string,
  title: string,
  content: string,
  actorId: string,
  action = "SNAPSHOT",
  detail?: string
): Promise<void> {
  const id = randomUUID();

  try {
    await prisma.$executeRaw`
      INSERT INTO note_audit_ledger (id, note_id, title, content, actor_id, action, detail, created_at)
      VALUES (
        ${id},
        ${noteId},
        ${title},
        ${content},
        ${actorId},
        ${action},
        ${detail ?? null},
        NOW()
      )
    `;
  } catch {
    await prisma.$executeRaw`
      INSERT INTO note_audit_ledger (id, note_id, title, content, actor_id, created_at)
      VALUES (${id}, ${noteId}, ${title}, ${content}, ${actorId}, NOW())
    `;
  }
}

export async function fetchAuditLedgerForNote(noteId: string) {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      note_id: string;
      title: string;
      content: string;
      action: string | null;
      detail: string | null;
      actor_id: string;
      created_at: Date;
    }>
  >`
    SELECT id, note_id, title, content,
           COALESCE(action, 'SNAPSHOT') AS action,
           detail, actor_id, created_at
    FROM note_audit_ledger
    WHERE note_id = ${noteId}
    ORDER BY created_at DESC
  `;

  if (rows.length === 0) return [];

  const actorIds = [...new Set(rows.map((r) => r.actor_id))];
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, email: true },
  });
  const emailById = new Map(actors.map((a) => [a.id, a.email]));

  return rows.map((row) =>
    formatAuditEntry({
      id: row.id,
      noteId: row.note_id,
      title: row.title,
      content: row.content,
      action: row.action ?? "SNAPSHOT",
      detail: row.detail,
      actorId: row.actor_id,
      createdAt: row.created_at,
      actorEmail: emailById.get(row.actor_id) ?? "unknown@vault.local",
    })
  );
}

function forbidden(res: import("express").Response): void {
  res.status(403).json({
    error: "Forbidden",
    message: "You do not have permission to perform this action",
  });
}

export { forbidden };
