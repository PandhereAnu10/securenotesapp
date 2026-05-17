"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { AuditLedgerEntry } from "@/lib/types";
import { notesApi, getErrorMessage } from "@/lib/api";
import { findActiveVersionEntryId } from "@/lib/version-match";
import { getNotePreviewText } from "@/lib/html";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AuditLedgerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string | null;
  noteTitle: string;
  currentTitle: string;
  currentContent: string;
  canRestore: boolean;
  onRestored: (note: { title: string; content: string }) => void;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function versionLabel(entry: AuditLedgerEntry, isActive: boolean): string {
  if (isActive) return "Active now";
  if (entry.action === "RESTORED") return "Restored snapshot";
  return "Saved snapshot";
}

export function AuditLedgerSheet({
  open,
  onOpenChange,
  noteId,
  noteTitle,
  currentTitle,
  currentContent,
  canRestore,
  onRestored,
}: AuditLedgerSheetProps) {
  const [entries, setEntries] = useState<AuditLedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeEntryId = useMemo(
    () => findActiveVersionEntryId(entries, currentTitle, currentContent),
    [entries, currentTitle, currentContent]
  );

  useEffect(() => {
    if (!open || !noteId) return;

    const load = async () => {
      setLoading(true);
      try {
        const { data } = await notesApi.getAuditLedger(noteId);
        setEntries(data);
        setSelectedId(data[0]?.id ?? null);
      } catch (err) {
        toast.error(getErrorMessage(err));
        setEntries([]);
        setSelectedId(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [open, noteId]);

  useEffect(() => {
    if (activeEntryId) setSelectedId(activeEntryId);
  }, [activeEntryId]);

  const handleRestore = async (entry: AuditLedgerEntry) => {
    if (!noteId || !canRestore) return;
    if (entry.id === activeEntryId) return;

    setRestoringId(entry.id);
    try {
      const { data } = await notesApi.restore(noteId, entry.id);
      toast.success("Version restored", {
        description: `Note updated to the version from ${formatWhen(entry.created_at)}.`,
      });
      onRestored({ title: data.note.title, content: data.note.content });
      const { data: refreshed } = await notesApi.getAuditLedger(noteId);
      setEntries(refreshed);
      const newActive = findActiveVersionEntryId(
        refreshed,
        data.note.title,
        data.note.content
      );
      setSelectedId(newActive ?? entry.id);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full border-obsidian-border bg-obsidian-panel sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold tracking-tight">Version history</SheetTitle>
          <SheetDescription className="text-sm text-zinc-400">
            Each save is a separate version with its own time. Select one, then restore to apply
            only that snapshot.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-9rem)] px-4 pb-8">
          {loading ? (
            <p className="text-sm text-zinc-400">Loading history…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-zinc-400">
              No history yet. Each save creates a version you can restore later.
            </p>
          ) : (
            <ul className="space-y-3">
              {entries.map((entry, index) => {
                const versionNo = entries.length - index;
                const isActive = entry.id === activeEntryId;
                const isSelected = entry.id === selectedId;
                const preview = getNotePreviewText(entry.content) || "(empty)";

                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(entry.id)}
                      className={cn(
                        "w-full rounded-none border px-3 py-3 text-left transition-colors",
                        isActive
                          ? "border-emerald-800/60 bg-emerald-950/20"
                          : "border-obsidian-border bg-black/40",
                        isSelected && !isActive && "ring-1 ring-zinc-400",
                        isSelected && isActive && "ring-1 ring-emerald-500"
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-zinc-300">
                            Version {versionNo}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-medium normal-case tracking-normal",
                              isActive
                                ? "border-emerald-700 text-emerald-400"
                                : "border-zinc-600 text-zinc-300"
                            )}
                          >
                            {versionLabel(entry, isActive)}
                          </Badge>
                        </div>
                        <span className="text-xs text-zinc-500">{formatWhen(entry.created_at)}</span>
                      </div>

                      <p className="mt-2 text-sm font-medium text-zinc-100">{entry.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{preview}</p>
                      <p className="mt-2 text-xs text-zinc-500">{entry.actor_email}</p>

                      {entry.detail && !isActive && (
                        <p className="mt-1 text-xs text-zinc-500">{entry.detail}</p>
                      )}
                    </button>

                    {canRestore && isSelected && !isActive && (
                      <Button
                        type="button"
                        size="sm"
                        className="mt-2 h-8 w-full rounded-none bg-foreground px-4 text-xs font-medium text-background hover:bg-foreground/90"
                        disabled={restoringId === entry.id}
                        onClick={() => void handleRestore(entry)}
                      >
                        {restoringId === entry.id
                          ? "Restoring…"
                          : `Restore version ${versionNo}`}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
