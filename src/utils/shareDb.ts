import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import type { ShareRoleValue, ShareStatusValue } from "../constants/share";

export interface ShareRow {
  id: string;
  note_id: string;
  shared_with_user_id: string;
  role: string;
  status: string;
  created_at: Date;
}

export async function findShareByNoteAndUser(
  noteId: string,
  sharedWithUserId: string
): Promise<ShareRow | null> {
  const rows = await prisma.$queryRaw<ShareRow[]>`
    SELECT id, note_id, shared_with_user_id, role, status, created_at
    FROM note_shares
    WHERE note_id = ${noteId} AND shared_with_user_id = ${sharedWithUserId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function findShareById(id: string): Promise<ShareRow | null> {
  const rows = await prisma.$queryRaw<ShareRow[]>`
    SELECT id, note_id, shared_with_user_id, role, status, created_at
    FROM note_shares
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function findShareByIdForUser(
  id: string,
  sharedWithUserId: string
): Promise<ShareRow | null> {
  const rows = await prisma.$queryRaw<ShareRow[]>`
    SELECT id, note_id, shared_with_user_id, role, status, created_at
    FROM note_shares
    WHERE id = ${id} AND shared_with_user_id = ${sharedWithUserId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function createShare(
  noteId: string,
  sharedWithUserId: string,
  role: ShareRoleValue,
  status: ShareStatusValue
): Promise<ShareRow> {
  const id = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO note_shares (id, note_id, shared_with_user_id, role, status, created_at)
    VALUES (${id}, ${noteId}, ${sharedWithUserId}, ${role}, ${status}, NOW())
  `;
  const row = await findShareById(id);
  if (!row) throw new Error("Failed to create share");
  return row;
}

export async function updateShareStatus(
  id: string,
  status: ShareStatusValue
): Promise<ShareRow> {
  await prisma.$executeRaw`
    UPDATE note_shares SET status = ${status} WHERE id = ${id}
  `;
  const row = await findShareById(id);
  if (!row) throw new Error("Share not found after update");
  return row;
}

export async function listSharesForNote(noteId: string): Promise<
  Array<ShareRow & { email: string }>
> {
  return prisma.$queryRaw<Array<ShareRow & { email: string }>>`
    SELECT s.id, s.note_id, s.shared_with_user_id, s.role, s.status, s.created_at,
           u.email
    FROM note_shares s
    INNER JOIN users u ON u.id = s.shared_with_user_id
    WHERE s.note_id = ${noteId}
    ORDER BY s.created_at DESC
  `;
}

export async function listAcceptedSharesForUser(
  sharedWithUserId: string
): Promise<ShareRow[]> {
  return prisma.$queryRaw<ShareRow[]>`
    SELECT id, note_id, shared_with_user_id, role, status, created_at
    FROM note_shares
    WHERE shared_with_user_id = ${sharedWithUserId} AND status = 'ACCEPTED'
    ORDER BY created_at DESC
  `;
}

export async function listPendingInvitesForUser(
  sharedWithUserId: string
): Promise<ShareRow[]> {
  return prisma.$queryRaw<ShareRow[]>`
    SELECT id, note_id, shared_with_user_id, role, status, created_at
    FROM note_shares
    WHERE shared_with_user_id = ${sharedWithUserId} AND status = 'PENDING'
    ORDER BY created_at DESC
  `;
}
