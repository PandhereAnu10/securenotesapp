"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { notesApi, getErrorMessage } from "@/lib/api";
import type { Collaborator } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ShareNoteDialogProps {
  noteId: string;
  disabled?: boolean;
}

export function ShareNoteDialog({ noteId, disabled }: ShareNoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"VIEWER" | "EDITOR">("VIEWER");
  const [loading, setLoading] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  const loadCollaborators = useCallback(async () => {
    try {
      const { data } = await notesApi.getCollaborators(noteId);
      setCollaborators(data);
    } catch {
      setCollaborators([]);
    }
  }, [noteId]);

  useEffect(() => {
    if (open) void loadCollaborators();
  }, [open, loadCollaborators]);

  const handleInvite = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await notesApi.share(noteId, trimmed, role);
      toast.success("Invitation sent", {
        description: `Invitation sent to ${trimmed}`,
      });
      setEmail("");
      await loadCollaborators();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        toast.error("User not found", {
          description: "User with this email is not registered on the platform.",
        });
      } else {
        toast.error("Invite failed", {
          description: getErrorMessage(err),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="rounded-none border-obsidian-border bg-obsidian-panel text-sm font-medium tracking-normal"
        >
          <Share2 className="mr-2 h-3.5 w-3.5" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="border-obsidian-border bg-obsidian-panel sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="tracking-tighter">Share note</DialogTitle>
          <DialogDescription>
            Invite collaborators with Viewer or Editor access. Editors can modify the note.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-0 border border-obsidian-border">
            <Input
              type="email"
              placeholder="collaborator@firm.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="h-10 flex-1 rounded-none border-0 border-r border-obsidian-border bg-black"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "VIEWER" | "EDITOR")}
              disabled={loading}
              className="h-10 rounded-none border-0 bg-black px-3 text-sm font-medium tracking-normal text-foreground outline-none"
            >
              <option value="VIEWER">Viewer</option>
              <option value="EDITOR">Editor</option>
            </select>
          </div>

          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              className="w-full rounded-none bg-foreground text-background"
              disabled={loading || !email.trim()}
              onClick={() => void handleInvite()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inviting…
                </>
              ) : (
                "Invite"
              )}
            </Button>
          </DialogFooter>

          <div className="space-y-2 border-t border-obsidian-border pt-4">
            <p className="text-ui-label">
              Active collaborators
            </p>
            {collaborators.length === 0 ? (
              <p className="text-ui-caption">No collaborators yet</p>
            ) : (
              <ul className="space-y-2">
                {collaborators.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between border border-obsidian-border bg-black px-3 py-2"
                  >
                    <span className="truncate text-sm tracking-tighter">{c.email}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline" className="text-sm font-medium tracking-normal">
                        {c.role}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-sm font-medium tracking-normal",
                          c.status === "ACCEPTED" && "border-emerald-900 text-emerald-500",
                          c.status === "PENDING" && "border-amber-900 text-amber-500"
                        )}
                      >
                        {c.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
