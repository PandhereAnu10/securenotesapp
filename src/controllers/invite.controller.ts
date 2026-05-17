import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { SHARE_STATUS } from "../constants/share";
import {
  findShareByIdForUser,
  listPendingInvitesForUser,
  updateShareStatus,
} from "../utils/shareDb";
import { getParamId } from "../utils/params";

function notFound(res: Response, message = "Invite not found"): void {
  res.status(404).json({ error: message, message });
}

export const listInvites = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  const invites = await listPendingInvitesForUser(userId);

  if (invites.length === 0) {
    res.status(200).json([]);
    return;
  }

  const noteIds = invites.map((i) => i.note_id);
  const notes = await prisma.note.findMany({
    where: { id: { in: noteIds } },
    select: { id: true, userId: true, title: true },
  });
  const noteById = new Map(notes.map((n) => [n.id, n]));
  const ownerIds = [...new Set(notes.map((n) => n.userId))];
  const owners = await prisma.user.findMany({
    where: { id: { in: ownerIds } },
    select: { id: true, email: true },
  });
  const ownerById = new Map(owners.map((o) => [o.id, o.email]));

  res.status(200).json(
    invites.map((invite) => {
      const note = noteById.get(invite.note_id);
      const inviterEmail = note ? ownerById.get(note.userId) ?? "unknown" : "unknown";
      const inviterName = inviterEmail.split("@")[0] ?? "User";
      return {
        id: invite.id,
        note_id: invite.note_id,
        note_title: note?.title ?? "Untitled",
        role: invite.role,
        status: invite.status,
        inviter_email: inviterEmail,
        inviter_name: inviterName.charAt(0).toUpperCase() + inviterName.slice(1),
        created_at: invite.created_at.toISOString(),
      };
    })
  );
};

export const acceptInvite = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const inviteId = getParamId(req);

  const invite = await findShareByIdForUser(inviteId, userId);

  if (!invite) {
    notFound(res);
    return;
  }

  if (invite.status !== SHARE_STATUS.PENDING) {
    res.status(400).json({
      error: "Invite is no longer pending",
      message: "Invite is no longer pending",
    });
    return;
  }

  const updated = await updateShareStatus(inviteId, SHARE_STATUS.ACCEPTED);

  res.status(200).json({
    message: "Invite accepted",
    share: {
      id: updated.id,
      note_id: updated.note_id,
      role: updated.role,
      status: updated.status,
    },
  });
};

export const declineInvite = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const inviteId = getParamId(req);

  const invite = await findShareByIdForUser(inviteId, userId);

  if (!invite) {
    notFound(res);
    return;
  }

  await updateShareStatus(inviteId, SHARE_STATUS.DECLINED);

  res.status(200).json({ message: "Invite declined" });
};
