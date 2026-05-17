"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { invitesApi, getErrorMessage } from "@/lib/api";
import type { PendingInvite } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InviteNotificationsProps {
  onInviteAccepted?: () => void;
}

export function InviteNotifications({ onInviteAccepted }: InviteNotificationsProps) {
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [open, setOpen] = useState(false);

  const loadInvites = useCallback(async () => {
    try {
      const { data } = await invitesApi.list();
      setInvites(data);
    } catch {
      setInvites([]);
    }
  }, []);

  useEffect(() => {
    void loadInvites();
    const interval = setInterval(() => void loadInvites(), 30_000);
    return () => clearInterval(interval);
  }, [loadInvites]);

  const handleAccept = async (invite: PendingInvite) => {
    try {
      await invitesApi.accept(invite.id);
      toast.success("INVITE ACCEPTED", {
        description: `You can now access "${invite.note_title}"`,
      });
      await loadInvites();
      onInviteAccepted?.();
    } catch (err) {
      toast.error(getErrorMessage(err).toUpperCase());
    }
  };

  const handleDecline = async (invite: PendingInvite) => {
    try {
      await invitesApi.decline(invite.id);
      toast.message("INVITE DECLINED");
      await loadInvites();
    } catch (err) {
      toast.error(getErrorMessage(err).toUpperCase());
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center border border-obsidian-border bg-black text-muted-foreground transition-colors hover:bg-obsidian-bg hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {invites.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-none bg-red-500" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-80 border-obsidian-border bg-obsidian-panel p-0"
      >
        <div className="border-b border-obsidian-border px-3 py-2">
          <p className="text-ui-label">
            Invitations
          </p>
        </div>
        {invites.length === 0 ? (
          <p className="px-3 py-4 text-ui-caption">
            No pending invites
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="border-b border-obsidian-border px-3 py-3 last:border-0"
              >
                <p className="text-sm tracking-tighter">
                  <span className="font-medium">{invite.inviter_name}</span> invited you to
                </p>
                <p className="mt-0.5 font-medium tracking-tighter">
                  &ldquo;{invite.note_title}&rdquo;
                </p>
                <p className="mt-1 text-ui-caption">
                  Role: {invite.role}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 flex-1 rounded-none bg-foreground text-sm font-medium text-background"
                    onClick={() => void handleAccept(invite)}
                  >
                    Accept
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 flex-1 rounded-none border-obsidian-border text-sm font-medium"
                    onClick={() => void handleDecline(invite)}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
