"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Mail, User } from "lucide-react";
import { authApi } from "@/lib/api";
import { getAuthUser, getDisplayNameFromEmail, getInitialFromEmail } from "@/lib/user";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface AccountSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountSettingsSheet({ open, onOpenChange }: AccountSettingsSheetProps) {
  const router = useRouter();

  const profile = useMemo(() => {
    const user = getAuthUser();
    if (!user?.email) {
      return {
        displayName: "User",
        initial: "U",
        email: "",
        userId: "",
      };
    }
    return {
      displayName: getDisplayNameFromEmail(user.email),
      initial: getInitialFromEmail(user.email),
      email: user.email,
      userId: user.userId,
    };
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-full border-obsidian-border bg-obsidian-panel sm:max-w-sm"
      >
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold tracking-tight">Account</SheetTitle>
          <SheetDescription className="text-sm text-zinc-400">
            Your profile and account details.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-8 flex flex-col items-center border border-obsidian-border bg-black px-6 py-8">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">{profile.initial}</AvatarFallback>
          </Avatar>
          <p className="mt-4 text-lg font-medium text-foreground">{profile.displayName}</p>
          <p className="mt-1 text-sm text-zinc-400">{profile.email || "—"}</p>
          <span className="mt-3 rounded-none border border-zinc-700 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
            Pro tier
          </span>
        </div>

        <dl className="mt-6 space-y-4">
          <div className="border border-obsidian-border bg-black/40 px-4 py-3">
            <dt className="flex items-center gap-2 text-xs font-medium text-zinc-500">
              <User className="h-3.5 w-3.5" />
              Display name
            </dt>
            <dd className="mt-1.5 text-sm text-zinc-100">{profile.displayName}</dd>
          </div>
          <div className="border border-obsidian-border bg-black/40 px-4 py-3">
            <dt className="flex items-center gap-2 text-xs font-medium text-zinc-500">
              <Mail className="h-3.5 w-3.5" />
              Email
            </dt>
            <dd className="mt-1.5 break-all text-sm text-zinc-100">
              {profile.email || "—"}
            </dd>
          </div>
          {profile.userId ? (
            <div className="border border-obsidian-border bg-black/40 px-4 py-3">
              <dt className="text-xs font-medium text-zinc-500">User ID</dt>
              <dd className="mt-1.5 break-all font-mono text-xs text-zinc-400">
                {profile.userId}
              </dd>
            </div>
          ) : null}
        </dl>

        <Button
          type="button"
          variant="outline"
          className="mt-8 w-full rounded-none border-obsidian-border text-sm font-medium text-destructive hover:bg-red-950/30 hover:text-red-300"
          onClick={() => {
            authApi.logout();
            onOpenChange(false);
            router.push("/login");
          }}
        >
          Sign out
        </Button>
      </SheetContent>
    </Sheet>
  );
}
