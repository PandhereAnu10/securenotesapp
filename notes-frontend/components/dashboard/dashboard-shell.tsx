"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { notesApi, getErrorMessage } from "@/lib/api";
import { shouldApplyRemoteNoteContent } from "@/lib/note-content";
import { getSyncErrorMessage } from "@/lib/sync-error";
import { isAuthenticated } from "@/lib/auth-token";
import type { Note, WorkspaceView } from "@/lib/types";
import { WorkspaceNav } from "./workspace-nav";
import { NoteListPanel } from "./note-list-panel";
import { NoteEditor } from "./note-editor";

export function DashboardShell() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<WorkspaceView>("all");
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [syncStatus, setSyncStatus] = useState<
    "synced" | "syncing" | "idle" | "retrying" | "error"
  >("idle");
  const [loadingNote, setLoadingNote] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draft, setDraft] = useState<{ title: string; content: string } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  const selectedIdRef = useRef(selectedId);
  const syncStatusRef = useRef(syncStatus);
  const lastPersistError = useRef<string | null>(null);
  const notesRef = useRef(notes);
  const saveSeqRef = useRef(0);

  selectedIdRef.current = selectedId;
  syncStatusRef.current = syncStatus;
  notesRef.current = notes;

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId]
  );

  const sortNotes = useCallback((list: Note[]) => {
    return [...list].sort((a, b) => {
      const aPinned = Boolean(a.is_pinned);
      const bPinned = Boolean(b.is_pinned);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, []);

  const visibleNotes = useMemo(() => {
    let list = notes;
    if (workspace === "shared") {
      list = notes.filter((n) => n.is_shared);
    } else if (workspace === "vault") {
      list = notes.filter((n) => Boolean(n.is_pinned));
    }
    return sortNotes(list);
  }, [notes, workspace, sortNotes]);

  const loadNotes = useCallback(async () => {
    try {
      const { data } = await notesApi.list();
      setNotes(data);
    } catch {
      setNotes([]);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    void loadNotes();
  }, [router, loadNotes]);

  const persistNote = useCallback(
    async (id: string, patch: { title: string; content: string }, attempt = 0) => {
      const seq = ++saveSeqRef.current;
      setSyncStatus(attempt > 0 ? "retrying" : "syncing");
      try {
        const { data } = await notesApi.update(id, patch);
        if (seq !== saveSeqRef.current) return true;

        setNotes((prev) => prev.map((n) => (n.id === data.id ? data : n)));

        const latest = draftRef.current;
        const stillCurrent =
          latest !== null &&
          latest.title === patch.title &&
          latest.content === patch.content;

        if (stillCurrent) {
          const synced = { title: data.title, content: data.content };
          draftRef.current = synced;
          setDraft(synced);
          setSyncStatus("synced");
        } else {
          setSyncStatus("syncing");
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => {
            const noteId = selectedIdRef.current;
            const pending = draftRef.current;
            if (!noteId || !pending) return;
            void persistNote(noteId, pending);
          }, 400);
        }

        lastPersistError.current = null;
        if (retryTimer.current) {
          clearTimeout(retryTimer.current);
          retryTimer.current = null;
        }
        return true;
      } catch (err) {
        const message = getSyncErrorMessage(err);
        console.error(message, err);
        const noRetry =
          axios.isAxiosError(err) &&
          (err.response?.status === 413 || err.response?.status === 400);
        if (attempt < 3 && !noRetry) {
          setSyncStatus("retrying");
          if (retryTimer.current) clearTimeout(retryTimer.current);
          retryTimer.current = setTimeout(() => {
            void persistNote(id, patch, attempt + 1);
          }, 3000);
        } else {
          setSyncStatus("error");
          if (lastPersistError.current !== message) {
            lastPersistError.current = message;
            toast.error("Could not save note", { description: message });
          }
        }
        return false;
      }
    },
    []
  );

  const flushPendingSave = useCallback(async () => {
    const id = selectedIdRef.current;
    const latest = draftRef.current;
    if (!id || !latest) return;

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    const saved = notesRef.current.find((n) => n.id === id);
    const needsSave =
      syncStatusRef.current !== "synced" ||
      !saved ||
      saved.title !== latest.title ||
      saved.content !== latest.content;

    if (needsSave) {
      await persistNote(id, latest);
    }
  }, [persistNote]);

  const selectNote = useCallback(
    async (id: string) => {
      await flushPendingSave();

      setSelectedId(id);
      setLoadingNote(true);
      setSyncStatus("syncing");

      try {
        const { data } = await notesApi.get(id);
        setNotes((prev) => {
          const exists = prev.some((n) => n.id === id);
          if (exists) return prev.map((n) => (n.id === id ? data : n));
          return [data, ...prev];
        });
        const loaded = { title: data.title, content: data.content };
        draftRef.current = loaded;
        setDraft(loaded);
        setEditorKey((k) => k + 1);
        setSyncStatus("synced");
      } catch (err) {
        const cached = notesRef.current.find((n) => n.id === id);
        if (cached) {
          const fallback = { title: cached.title, content: cached.content };
          draftRef.current = fallback;
          setDraft(fallback);
          setEditorKey((k) => k + 1);
          setSyncStatus("synced");
        } else {
          toast.error("Could not load note", { description: getErrorMessage(err) });
          setSelectedId(null);
          setDraft(null);
          setSyncStatus("idle");
        }
      } finally {
        setLoadingNote(false);
      }
    },
    [flushPendingSave]
  );

  const handleCreate = async () => {
    await flushPendingSave();
    try {
      const { data } = await notesApi.create({
        title: "Untitled",
        content: "<p></p>",
      });
      setNotes((prev) => [data, ...prev]);
      setSelectedId(data.id);
      const created = { title: data.title, content: data.content };
      draftRef.current = created;
      setDraft(created);
      setEditorKey((k) => k + 1);
      setSyncStatus("synced");
    } catch (err) {
      console.error(getErrorMessage(err));
    }
  };

  const handleSave = async () => {
    const id = selectedIdRef.current;
    const latest = draftRef.current;
    if (!id || !latest) return;
    await persistNote(id, latest);
  };

  const handleChange = (patch: { title: string; content: string }) => {
    const note = notes.find((n) => n.id === selectedId);
    if (note && note.can_edit === false) return;

    draftRef.current = patch;
    setDraft(patch);
    setSyncStatus("syncing");

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const id = selectedIdRef.current;
      const latest = draftRef.current;
      if (!id || !latest) return;
      void persistNote(id, latest);
    }, 800);
  };

  const handleRestored = (patch: { title: string; content: string }) => {
    if (!selectedId) return;
    draftRef.current = patch;
    setDraft(patch);
    setNotes((prev) =>
      prev.map((n) =>
        n.id === selectedId ? { ...n, title: patch.title, content: patch.content } : n
      )
    );
    setEditorKey((k) => k + 1);
    setSyncStatus("synced");
  };

  const handleCloseNote = async () => {
    await flushPendingSave();
    setSelectedId(null);
    setDraft(null);
    setSyncStatus("idle");
    if (saveTimer.current) clearTimeout(saveTimer.current);
  };

  const handlePin = useCallback(async (id: string, pinned: boolean) => {
    try {
      const { data } = await notesApi.pin(id, pinned);
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...data.note, is_pinned: pinned } : n))
      );
      toast.success(pinned ? "Note pinned" : "Note unpinned");
    } catch (err) {
      toast.error("Could not update pin", { description: getErrorMessage(err) });
    }
  }, []);

  const handleDelete = async (id: string) => {
    if (selectedId === id) await flushPendingSave();
    await notesApi.delete(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setDraft(null);
      setSyncStatus("idle");
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
  };

  const handleFlushSave = useCallback(
    (patch: { title: string; content: string }) => {
      const id = selectedIdRef.current;
      if (!id) return;
      draftRef.current = patch;
      setDraft(patch);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      void persistNote(id, patch);
    },
    [persistNote]
  );

  useEffect(() => {
    if (!selectedId) return;

    const isDraftDirty = () => {
      const local = draftRef.current;
      const saved = notesRef.current.find((n) => n.id === selectedId);
      if (!local || !saved) return false;
      return saved.title !== local.title || saved.content !== local.content;
    };

    const refreshFromServer = async () => {
      if (
        syncStatusRef.current === "syncing" ||
        syncStatusRef.current === "retrying"
      ) {
        return;
      }
      if (isDraftDirty()) return;

      try {
        const { data } = await notesApi.get(selectedId);
        setNotes((prev) => {
          const current = prev.find((n) => n.id === selectedId);
          if (!current) return prev;
          if (new Date(data.updated_at) <= new Date(current.updated_at)) {
            return prev;
          }
          return prev.map((n) => (n.id === data.id ? data : n));
        });

        const local = draftRef.current;
        if (!local) return;
        if (!shouldApplyRemoteNoteContent(local.content, data.content)) {
          return;
        }
        if (
          local.title !== data.title ||
          local.content !== data.content
        ) {
          const remote = { title: data.title, content: data.content };
          draftRef.current = remote;
          setDraft(remote);
          setEditorKey((k) => k + 1);
        }
      } catch {
        /* ignore poll errors */
      }
    };

    const note = notesRef.current.find((n) => n.id === selectedId);
    const pollMs = note?.is_shared ? 4_000 : 12_000;
    const interval = setInterval(() => void refreshFromServer(), pollMs);
    const onFocus = () => void refreshFromServer();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [selectedId]);

  const counts = {
    all: notes.length,
    shared: notes.filter((n) => n.is_shared).length,
    vault: notes.filter((n) => Boolean(n.is_pinned)).length,
  };

  return (
    <div className="grid h-screen grid-cols-[240px_320px_1fr] overflow-hidden bg-obsidian-bg">
      <div className="min-h-0 overflow-hidden">
        <WorkspaceNav
          active={workspace}
          onChange={setWorkspace}
          counts={counts}
          onInviteAccepted={() => void loadNotes()}
        />
      </div>
      <div className="min-h-0 overflow-hidden">
        <NoteListPanel
          notes={visibleNotes}
          selectedId={selectedId}
          search={search}
          onSearchChange={setSearch}
          onSelect={(id) => void selectNote(id)}
          onCreate={() => void handleCreate()}
          onDelete={handleDelete}
          onPin={(id, pinned) => void handlePin(id, pinned)}
        />
      </div>
      <div className="min-h-0 overflow-hidden">
        <NoteEditor
          note={selectedNote}
          draft={draft}
          loading={loadingNote}
          editorKey={editorKey}
          syncStatus={syncStatus}
          onChange={handleChange}
          onSave={() => void handleSave()}
          onRestored={handleRestored}
          onClose={() => void handleCloseNote()}
          onDelete={handleDelete}
          onFlushSave={handleFlushSave}
        />
      </div>
    </div>
  );
}
