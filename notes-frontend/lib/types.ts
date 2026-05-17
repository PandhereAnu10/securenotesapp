export type ShareRole = "VIEWER" | "EDITOR" | "OWNER";
export type ShareStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export interface Note {
  id: string;
  title: string;
  content: string;
  is_pinned?: boolean;
  is_owner?: boolean;
  is_shared?: boolean;
  can_edit?: boolean;
  role?: ShareRole | null;
  share_status?: ShareStatus | null;
  created_at: string;
  updated_at: string;
}

export type WorkspaceView = "all" | "shared" | "vault";

export interface AuditLedgerEntry {
  id: string;
  note_id: string;
  title: string;
  content: string;
  action: string;
  detail: string | null;
  actor_id: string;
  actor_email: string;
  created_at: string;
}

export interface PendingInvite {
  id: string;
  note_id: string;
  note_title: string;
  role: ShareRole;
  status: ShareStatus;
  inviter_email: string;
  inviter_name: string;
  created_at: string;
}

export interface Collaborator {
  id: string;
  email: string;
  role: ShareRole;
  status: ShareStatus;
  created_at: string;
}
