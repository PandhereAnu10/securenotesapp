"use client";

import { useMemo, useState } from "react";
import { FileText, Share2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceView } from "@/lib/types";
import { getAuthUser, getDisplayNameFromEmail, getInitialFromEmail } from "@/lib/user";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { InviteNotifications } from "./invite-notifications";
import { AccountSettingsSheet } from "./account-settings-sheet";

const navItems: { id: WorkspaceView; label: string; icon: typeof FileText }[] = [
  { id: "all", label: "All Notes", icon: FileText },
  { id: "shared", label: "Shared", icon: Share2 },
  { id: "vault", label: "Pinned", icon: Shield },
];

interface WorkspaceNavProps {
  active: WorkspaceView;
  onChange: (view: WorkspaceView) => void;
  counts: { all: number; shared: number; vault: number };
  onInviteAccepted?: () => void;
}

export function WorkspaceNav({
  active,
  onChange,
  counts,
  onInviteAccepted,
}: WorkspaceNavProps) {
  const [accountOpen, setAccountOpen] = useState(false);

  const profile = useMemo(() => {
    const user = getAuthUser();
    if (!user?.email) {
      return { displayName: "User", initial: "U", email: "" };
    }
    return {
      displayName: getDisplayNameFromEmail(user.email),
      initial: getInitialFromEmail(user.email),
      email: user.email,
    };
  }, [accountOpen]);

  const countFor = (id: WorkspaceView) => {
    if (id === "all") return counts.all;
    if (id === "shared") return counts.shared;
    return counts.vault;
  };

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-obsidian-border bg-obsidian-panel">
      <div className="flex items-center justify-between border-b border-obsidian-border p-5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Secure Notes</h1>
        </div>
        <InviteNotifications onInviteAccepted={onInviteAccepted} />
      </div>

      <nav className="flex-1 p-2">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "flex w-full items-center justify-between border border-transparent px-4 py-3 text-left text-sm tracking-tighter transition-colors",
              active === id
                ? "border-obsidian-border bg-black text-foreground"
                : "text-muted-foreground hover:border-obsidian-border hover:bg-black/50 hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-3">
              <Icon className="h-4 w-4" />
              {label}
            </span>
            <Badge variant="outline" className="text-sm font-medium tracking-normal">
              {countFor(id)}
            </Badge>
          </button>
        ))}
      </nav>

      <div className="border-t border-obsidian-border p-4">
        <button
          type="button"
          onClick={() => setAccountOpen(true)}
          className="flex w-full items-center gap-3 border border-obsidian-border bg-black px-3 py-2 text-left transition-colors hover:bg-obsidian-bg"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>{profile.initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium tracking-tight text-foreground">
              {profile.displayName}
            </p>
            <p className="truncate text-ui-caption">Account settings</p>
          </div>
        </button>
      </div>

      <AccountSettingsSheet open={accountOpen} onOpenChange={setAccountOpen} />
    </aside>
  );
}
