"use client";

import { useState } from "react";
import { Loader2, Pin, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Note } from "@/lib/types";
import { stripHtml } from "@/lib/html";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

interface NoteListPanelProps {
  notes: Note[];
  selectedId: string | null;
  search: string;
  onSearchChange: (q: string) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => Promise<void>;
  onPin: (id: string, pinned: boolean) => void;
}

export function NoteListPanel({
  notes,
  selectedId,
  search,
  onSearchChange,
  onSelect,
  onCreate,
  onDelete,
  onPin,
}: NoteListPanelProps) {
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = notes.filter((n) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const plain = stripHtml(n.content).toLowerCase();
    return n.title.toLowerCase().includes(q) || plain.includes(q);
  });

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await onDelete(pendingDelete.id);
      toast.success("Note deleted", {
        description: pendingDelete.title || "Untitled",
      });
      setPendingDelete(null);
    } catch {
      toast.error("Could not delete note");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col border-r border-obsidian-border bg-obsidian-panel">
      <div className="shrink-0 flex items-center gap-0 border-b border-obsidian-border p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search notes…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 border-obsidian-border bg-black pl-9 text-sm tracking-normal"
          />
        </div>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="ml-0 h-10 w-10 shrink-0 rounded-none border-obsidian-border border-l-0 bg-black"
          onClick={onCreate}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="notes-list-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex flex-col">
          {filtered.length === 0 ? (
            <p className="p-6 text-ui-meta">No notes in this view.</p>
          ) : (
            filtered.map((note) => {
              const canDelete = note.is_owner === true;
              const canPin = note.is_owner === true;
              const pinned = Boolean(note.is_pinned);

              return (
                <div
                  key={note.id}
                  className={cn(
                    "group relative border-b border-obsidian-border transition-colors",
                    selectedId === note.id ? "bg-black" : "hover:bg-black/60",
                    pinned && selectedId !== note.id && "bg-black/30"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(note.id)}
                    className="w-full px-4 py-3 pr-20 text-left"
                  >
                    <div className="flex items-center gap-1.5">
                      {pinned && (
                        <Pin
                          className="h-3 w-3 shrink-0 fill-amber-500 text-amber-500"
                          aria-hidden
                        />
                      )}
                      <p className="truncate text-sm font-medium tracking-tight text-foreground">
                        {note.title || "Untitled"}
                      </p>
                    </div>
                    <p className="mt-1.5 text-ui-caption">{formatDate(note.updated_at)}</p>
                  </button>

                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                    {canPin && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8 rounded-none",
                          pinned
                            ? "text-amber-500 opacity-100"
                            : "text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100"
                        )}
                        aria-label={pinned ? "Unpin note" : "Pin note"}
                        onClick={(e) => {
                          e.stopPropagation();
                          onPin(note.id, !pinned);
                        }}
                      >
                        <Pin className={cn("h-3.5 w-3.5", pinned && "fill-current")} />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-none opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                        aria-label={`Delete ${note.title || "note"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDelete(note);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-400" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <DialogContent className="border-obsidian-border bg-obsidian-panel sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="tracking-tighter">Delete note?</DialogTitle>
            <DialogDescription>
              This will permanently delete &ldquo;{pendingDelete?.title || "Untitled"}&rdquo;.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-none border-obsidian-border"
              disabled={deleting}
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-none"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
