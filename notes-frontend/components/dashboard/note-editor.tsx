"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Clock,
  History,
  Italic,
  List,
  Paperclip,
  PenLine,
  Strikethrough,
  Trash2,
  Underline as UnderlineIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Note } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuditLedgerSheet } from "./audit-ledger-sheet";
import { ShareNoteDialog } from "./share-note-dialog";
import { RichTextEditor } from "./rich-text-editor";
import { EditorDrawDialog } from "./editor-draw-dialog";
import { DeleteNoteDialog } from "./delete-note-dialog";
import { cn } from "@/lib/utils";
import { deleteSelectedBlockFromEditor } from "@/lib/editor-blocks";
import { countAttachments } from "@/lib/note-content";
import { NodeSelection } from "@tiptap/pm/state";

type BlockSelection = { kind: "image"; src: string; isDrawing: boolean } | { kind: "attachment" };

interface NoteEditorProps {
  note: Note | null;
  draft: { title: string; content: string } | null;
  loading?: boolean;
  editorKey?: number;
  syncStatus: "synced" | "syncing" | "idle" | "retrying" | "error";
  onChange: (patch: { title: string; content: string }) => void;
  onSave: () => void;
  onRestored: (patch: { title: string; content: string }) => void;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  onFlushSave?: (patch: { title: string; content: string }) => void;
}

export function NoteEditor({
  note,
  draft,
  loading = false,
  editorKey = 0,
  syncStatus,
  onChange,
  onSave,
  onRestored,
  onClose,
  onDelete,
  onFlushSave,
}: NoteEditorProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [drawOpen, setDrawOpen] = useState(false);
  const [drawEditSrc, setDrawEditSrc] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [blockSelection, setBlockSelection] = useState<BlockSelection | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef("");

  const title = draft?.title ?? "";
  const content = draft?.content ?? "";

  useEffect(() => {
    contentRef.current = content;
    setBlockSelection(null);
  }, [note?.id, editorKey]);

  const canEdit = note?.can_edit ?? note?.is_owner ?? false;
  const isViewer = note?.role === "VIEWER" || (note?.is_shared && !canEdit);
  const isOwner = note?.is_owner === true;

  const pushContent = useCallback(
    (html: string, flush = false) => {
      const patch = { title, content: html };
      onChange(patch);
      if (flush) onFlushSave?.(patch);
    },
    [onChange, onFlushSave, title]
  );

  const handleTitle = (value: string) => {
    if (!canEdit) return;
    const html = editor?.getHTML() ?? contentRef.current ?? content;
    contentRef.current = html;
    onChange({ title: value, content: html });
  };

  const handleContent = (html: string) => {
    if (!canEdit) return;
    contentRef.current = html;
    onChange({ title, content: html });
  };

  const handleEditorRef = useCallback((ed: Editor | null) => {
    setEditor(ed);
  }, []);

  useEffect(() => {
    if (!editor) return;

    const syncSelection = () => {
      if (editor.isActive("image")) {
        const attrs = editor.getAttributes("image") as {
          src?: string;
          isDrawing?: boolean;
        };
        if (attrs.src) {
          setBlockSelection({
            kind: "image",
            src: attrs.src,
            isDrawing: Boolean(attrs.isDrawing),
          });
          return;
        }
      }
      const { selection } = editor.state;
      if (
        editor.isActive("noteAttachment") ||
        (selection instanceof NodeSelection &&
          selection.node.type.name === "noteAttachment")
      ) {
        setBlockSelection({ kind: "attachment" });
        return;
      }
      setBlockSelection(null);
    };

    const flushStructuralChange = () => {
      const html = editor.getHTML();
      const prev = contentRef.current;
      const attachmentRemoved = countAttachments(prev) > countAttachments(html);
      const drawingRemoved =
        (prev.match(/data-drawing="true"/gi) ?? []).length >
        (html.match(/data-drawing="true"/gi) ?? []).length;
      if (attachmentRemoved || drawingRemoved) {
        contentRef.current = html;
        pushContent(html, true);
      }
    };

    editor.on("selectionUpdate", syncSelection);
    editor.on("update", flushStructuralChange);
    return () => {
      editor.off("selectionUpdate", syncSelection);
      editor.off("update", flushStructuralChange);
    };
  }, [editor, pushContent]);

  const insertDrawing = (dataUrl: string) => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "image",
        attrs: { src: dataUrl, alt: "Drawing", isDrawing: true },
      })
      .run();
    pushContent(editor.getHTML(), true);
    toast.success("Drawing inserted");
  };

  const updateDrawing = (dataUrl: string) => {
    if (!editor) return;
    editor.chain().focus().updateAttributes("image", { src: dataUrl }).run();
    pushContent(editor.getHTML(), true);
    setDrawEditSrc(null);
    toast.success("Drawing updated");
  };

  const openDrawEdit = () => {
    if (blockSelection?.kind === "image" && blockSelection.isDrawing) {
      setDrawEditSrc(blockSelection.src);
      setDrawOpen(true);
    }
  };

  const removeSelectedBlock = () => {
    if (!editor || !blockSelection) return;
    const removed = deleteSelectedBlockFromEditor(editor);
    if (!removed) {
      toast.error("Could not remove selection");
      return;
    }
    pushContent(editor.getHTML(), true);
    setBlockSelection(null);
    toast.success("Removed");
  };

  const handleAttachFiles = (files: FileList | null) => {
    if (!editor || !files?.length) return;
    const maxBytes = 2 * 1024 * 1024;

    Array.from(files).forEach((file) => {
      if (file.size > maxBytes) {
        toast.error("File too large", {
          description: `${file.name} exceeds 2MB limit.`,
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        if (file.type.startsWith("image/")) {
          editor
            .chain()
            .focus()
            .insertContent({
              type: "noteAttachment",
              attrs: {
                fileName: file.name,
                fileType: file.type,
                dataUrl,
              },
            })
            .run();
        } else {
          editor
            .chain()
            .focus()
            .insertContent({
              type: "noteAttachment",
              attrs: {
                fileName: file.name,
                fileType: file.type || "application/octet-stream",
                dataUrl,
              },
            })
            .run();
        }
        pushContent(editor.getHTML(), true);
        toast.success("File attached", { description: file.name });
      };
      reader.readAsDataURL(file);
    });
  };

  const confirmDelete = async () => {
    if (!note || !isOwner) return;
    setDeleting(true);
    try {
      await onDelete(note.id);
      toast.success("Note deleted");
      setDeleteOpen(false);
    } catch {
      toast.error("Could not delete note");
    } finally {
      setDeleting(false);
    }
  };

  if (!note || !draft) {
    return (
      <section className="flex h-full flex-col items-center justify-center bg-obsidian-bg px-8">
        <div className="max-w-md text-center">
          <p className="font-sans text-base tracking-tighter text-foreground/90">
            Select a note to begin work.
          </p>
          <p className="mt-3 text-ui-meta">
            All connections are encrypted.
          </p>
        </div>
      </section>
    );
  }

  const toolbarItems = [
    {
      label: "Bold",
      icon: Bold,
      active: editor?.isActive("bold"),
      action: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      icon: Italic,
      active: editor?.isActive("italic"),
      action: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      label: "Underline",
      icon: UnderlineIcon,
      active: editor?.isActive("underline"),
      action: () => editor?.chain().focus().toggleUnderline().run(),
    },
    {
      label: "Strikethrough",
      icon: Strikethrough,
      active: editor?.isActive("strike"),
      action: () => editor?.chain().focus().toggleStrike().run(),
    },
    {
      label: "List",
      icon: List,
      active: editor?.isActive("bulletList"),
      action: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Draw",
      icon: PenLine,
      active: false,
      action: () => {
        setDrawEditSrc(null);
        setDrawOpen(true);
      },
    },
    {
      label: "Attach file",
      icon: Paperclip,
      active: false,
      action: () => fileInputRef.current?.click(),
    },
  ];

  return (
    <section className="relative flex h-full min-h-0 flex-col bg-obsidian-bg">
      <header className="flex shrink-0 items-center justify-between border-b border-obsidian-border px-8 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 text-sm font-medium tracking-normal",
              syncStatus === "synced" && "border-emerald-900 text-emerald-500",
              (syncStatus === "syncing" || syncStatus === "retrying") &&
                "border-amber-900 text-amber-500",
              syncStatus === "idle" && "border-zinc-700 text-zinc-500",
              syncStatus === "error" && "border-red-900 text-red-500"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-none",
                syncStatus === "synced" && "bg-emerald-500",
                (syncStatus === "syncing" || syncStatus === "retrying") &&
                  "bg-amber-500 animate-pulse",
                syncStatus === "idle" && "bg-zinc-500",
                syncStatus === "error" && "bg-red-500"
              )}
            />
            {syncStatus === "synced"
              ? "Synced"
              : syncStatus === "syncing"
                ? "Syncing"
                : syncStatus === "retrying"
                  ? "Retrying…"
                  : syncStatus === "error"
                    ? "Save failed"
                    : "Idle"}
          </Badge>
          {isViewer && (
            <Badge variant="outline" className="text-sm font-medium tracking-normal">
              Viewing only
            </Badge>
          )}
          {note.role === "EDITOR" && note.is_shared && (
            <Badge variant="outline" className="text-sm font-medium tracking-normal">
              Editor access
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ShareNoteDialog noteId={note.id} disabled={!isOwner} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-none border-obsidian-border bg-obsidian-panel text-sm font-medium tracking-normal"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="mr-2 h-3.5 w-3.5" />
            History
          </Button>
          {isOwner && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-none border-red-900/50 bg-obsidian-panel text-sm font-medium tracking-normal text-red-400 hover:bg-red-950/30 hover:text-red-300"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            disabled={!canEdit}
            className="rounded-none bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40"
            onClick={onSave}
          >
            Save
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-none text-muted-foreground hover:bg-black hover:text-foreground"
            onClick={onClose}
            aria-label="Close note"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-8 pb-32 pt-10">
        {loading ? (
          <p className="text-sm text-zinc-400">Loading note…</p>
        ) : (
          <>
            <input
              value={title}
              onChange={(e) => handleTitle(e.target.value)}
              placeholder="Note title"
              readOnly={!canEdit}
              className="w-full border-0 bg-transparent text-5xl font-medium tracking-tighter text-foreground outline-none placeholder:text-muted-foreground/40 disabled:opacity-70"
            />
            <div className="mt-8 [&_.tiptap]:outline-none [&_.ProseMirror]:outline-none">
              <RichTextEditor
                key={`${note.id}-${editorKey}-${canEdit}`}
                content={content}
                editable={canEdit}
                onChange={handleContent}
                editorRef={handleEditorRef}
              />
            </div>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          handleAttachFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <EditorDrawDialog
        open={drawOpen}
        onOpenChange={(open) => {
          setDrawOpen(open);
          if (!open) setDrawEditSrc(null);
        }}
        initialImage={drawEditSrc}
        onInsert={insertDrawing}
        onUpdate={updateDrawing}
      />

      <DeleteNoteDialog
        open={deleteOpen}
        title={title}
        deleting={deleting}
        onOpenChange={setDeleteOpen}
        onConfirm={() => void confirmDelete()}
      />

      {canEdit && (
        <div className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-2">
          {blockSelection && (
            <div className="pointer-events-auto flex items-center gap-2 border-2 border-amber-600/80 bg-zinc-900 px-3 py-2 shadow-2xl">
              <span className="px-1 text-sm font-medium text-amber-400">
                {blockSelection.kind === "image"
                  ? blockSelection.isDrawing
                    ? "Drawing selected"
                    : "Image selected"
                  : "Attachment selected"}
              </span>
              {blockSelection.kind === "image" && blockSelection.isDrawing && (
                <Button
                  type="button"
                  size="sm"
                  className="h-9 rounded-none border border-zinc-500 bg-zinc-800 px-4 text-sm font-medium text-foreground hover:bg-zinc-700"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={openDrawEdit}
                >
                  Edit
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                className="h-9 rounded-none border border-red-800 bg-red-950/50 px-4 text-sm font-medium text-red-300 hover:bg-red-950"
                onMouseDown={(e) => e.preventDefault()}
                onClick={removeSelectedBlock}
              >
                Remove
              </Button>
            </div>
          )}

          <div
            className="pointer-events-auto flex items-center gap-1 border border-obsidian-border bg-obsidian-panel px-2 py-2 shadow-2xl"
            role="toolbar"
            aria-label="Formatting"
          >
            {toolbarItems.map(({ label, icon: Icon, active, action }) => (
              <Button
                key={label}
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9 rounded-none hover:bg-black",
                  active && "bg-black text-foreground"
                )}
                aria-label={label}
                aria-pressed={active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  action();
                }}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
            <span className="mx-2 h-6 w-px bg-obsidian-border" />
            <span className="text-ui-meta flex items-center gap-1.5 px-2">
              <Clock className="h-3 w-3" />
              {new Date(note.updated_at).toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}

      <AuditLedgerSheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        noteId={note.id}
        noteTitle={title}
        currentTitle={title}
        currentContent={content}
        canRestore={canEdit}
        onRestored={onRestored}
      />
    </section>
  );
}
