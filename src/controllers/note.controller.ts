import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { SHARE_ROLE, SHARE_STATUS } from "../constants/share";
import {
  appendAuditSnapshot,
  fetchAuditLedgerForNote,
  formatNote,
  forbidden,
  getNotePermission,
} from "../utils/noteAccess";
import {
  createShare,
  findShareByNoteAndUser,
  listAcceptedSharesForUser,
  listSharesForNote,
} from "../utils/shareDb";
import { getParamId } from "../utils/params";

function unauthorized(res: Response): void {
  res.status(401).json({ error: "Unauthorized", message: "Unauthorized" });
}

function notFound(res: Response, message = "Note not found"): void {
  res.status(404).json({ error: message, message });
}

export const listNotes = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  const ownedNotes = await prisma.note.findMany({
    where: { userId },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
  });

  const sharedEntries = await listAcceptedSharesForUser(userId);
  const sharedNoteRecords =
    sharedEntries.length > 0
      ? await prisma.note.findMany({
          where: { id: { in: sharedEntries.map((s) => s.note_id) } },
        })
      : [];
  const noteById = new Map(sharedNoteRecords.map((n) => [n.id, n]));

  const sharedNotes = sharedEntries
    .map((s) => {
      const note = noteById.get(s.note_id);
      if (!note) return null;
      return {
        note,
        permission: {
          access: s.role === SHARE_ROLE.EDITOR ? ("editor" as const) : ("viewer" as const),
          canEdit: s.role === SHARE_ROLE.EDITOR,
          note: { id: note.id, userId: note.userId, title: note.title },
          role: s.role,
          status: s.status,
        },
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const ownedIds = new Set(ownedNotes.map((n) => n.id));
  const uniqueShared = sharedNotes.filter((s) => !ownedIds.has(s.note.id));

  const allNotes = [
    ...ownedNotes.map((n) => ({ note: n, permission: undefined })),
    ...uniqueShared,
  ].sort((a, b) => {
    const aPinned = a.note.isPinned;
    const bPinned = b.note.isPinned;
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    return b.note.updatedAt.getTime() - a.note.updatedAt.getTime();
  });

  res.status(200).json(
    allNotes.map(({ note, permission }) =>
      formatNote(note, userId, permission as Parameters<typeof formatNote>[2])
    )
  );
};

export const getNote = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const id = getParamId(req);

  const permission = await getNotePermission(id, userId);

  if (!permission.note) {
    notFound(res);
    return;
  }

  if (permission.access === "none") {
    unauthorized(res);
    return;
  }

  const note = await prisma.note.findUnique({ where: { id } });
  res.status(200).json(formatNote(note!, userId, permission));
};

export const createNote = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { title, content } = req.body as { title: string; content: string };

  const note = await prisma.note.create({
    data: { title, content: content ?? "", userId },
  });

  await appendAuditSnapshot(note.id, note.title, note.content, userId);

  res.status(201).json(formatNote(note, userId));
};

export const updateNote = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const id = getParamId(req);
  const { title, content } = req.body as { title: string; content: string };

  const permission = await getNotePermission(id, userId);

  if (!permission.note) {
    notFound(res);
    return;
  }

  if (!permission.canEdit) {
    forbidden(res);
    return;
  }

  const previous = await prisma.note.findUnique({
    where: { id },
    select: { title: true, content: true },
  });

  const note = await prisma.note.update({
    where: { id },
    data: { title, content },
  });

  const contentChanged =
    previous?.title !== note.title || previous?.content !== note.content;
  if (contentChanged) {
    await appendAuditSnapshot(note.id, note.title, note.content, userId);
  }

  res.status(200).json(formatNote(note, userId, permission));
};

export const deleteNote = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const id = getParamId(req);

  const permission = await getNotePermission(id, userId);

  if (!permission.note) {
    notFound(res);
    return;
  }

  if (permission.access !== "owner") {
    forbidden(res);
    return;
  }

  await prisma.note.delete({ where: { id } });
  res.status(204).send();
};

export const listCollaborators = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user!.userId;
  const id = getParamId(req);

  const permission = await getNotePermission(id, userId);

  if (!permission.note) {
    notFound(res);
    return;
  }

  if (permission.access !== "owner") {
    forbidden(res);
    return;
  }

  const shares = await listSharesForNote(id);

  res.status(200).json(
    shares.map((s) => ({
      id: s.id,
      email: s.email,
      role: s.role,
      status: s.status,
      created_at: s.created_at.toISOString(),
    }))
  );
};

export const shareNote = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const id = getParamId(req);
  const { share_with_email, role } = req.body as {
    share_with_email: string;
    role: "VIEWER" | "EDITOR";
  };

  const permission = await getNotePermission(id, userId);

  if (!permission.note) {
    notFound(res);
    return;
  }

  if (permission.access !== "owner") {
    forbidden(res);
    return;
  }

  const targetUser = await prisma.user.findUnique({
    where: { email: share_with_email },
  });

  if (!targetUser) {
    notFound(res, "User with this email is not registered on the platform.");
    return;
  }

  if (targetUser.id === userId) {
    res.status(400).json({
      error: "Cannot share a note with yourself",
      message: "Cannot share a note with yourself",
    });
    return;
  }

  const existingShare = await findShareByNoteAndUser(id, targetUser.id);

  if (existingShare) {
    res.status(409).json({
      error: "Note already shared with this user",
      message: "Note already shared with this user",
    });
    return;
  }

  const share = await createShare(
    id,
    targetUser.id,
    role ?? SHARE_ROLE.VIEWER,
    SHARE_STATUS.PENDING
  );

  res.status(200).json({
    message: "Invitation sent successfully",
    share: {
      id: share.id,
      email: share_with_email,
      role: share.role,
      status: share.status,
    },
  });
};

export const pinNote = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const id = getParamId(req);
  const { pinned } = req.body as { pinned: boolean };

  const permission = await getNotePermission(id, userId);

  if (!permission.note) {
    notFound(res);
    return;
  }

  if (permission.access !== "owner") {
    forbidden(res);
    return;
  }

  const note = await prisma.note.update({
    where: { id },
    data: { isPinned: pinned },
  });

  res.status(200).json({
    message: pinned ? "Note pinned successfully" : "Note unpinned successfully",
    note: formatNote(note, userId, permission),
  });
};

export const getNoteAuditLedger = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user!.userId;
  const id = getParamId(req);

  const permission = await getNotePermission(id, userId);

  if (!permission.note) {
    notFound(res);
    return;
  }

  if (permission.access === "none") {
    unauthorized(res);
    return;
  }

  const entries = await fetchAuditLedgerForNote(id);
  res.status(200).json(entries);
};

export const restoreNoteVersion = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user!.userId;
  const id = getParamId(req);
  const { ledger_id } = req.body as { ledger_id: string };

  const permission = await getNotePermission(id, userId);

  if (!permission.note) {
    notFound(res);
    return;
  }

  if (!permission.canEdit) {
    forbidden(res);
    return;
  }

  const snapshot = await prisma.noteAuditLedger.findFirst({
    where: { id: ledger_id, noteId: id },
  });

  if (!snapshot) {
    notFound(res, "Audit snapshot not found");
    return;
  }

  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  const actorLabel = actor?.email?.split("@")[0] ?? "User";

  const note = await prisma.note.update({
    where: { id },
    data: {
      title: snapshot.title,
      content: snapshot.content,
    },
  });

  await appendAuditSnapshot(
    note.id,
    note.title,
    note.content,
    userId,
    "RESTORED",
    `Version restored by ${actorLabel}`
  );

  res.status(200).json({
    message: "Note restored from audit ledger",
    note: formatNote(note, userId, permission),
  });
};
