"use client";

import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { NoteAttachment } from "./tiptap/note-attachment-extension";
import { NoteImage } from "./tiptap/note-image-extension";

interface RichTextEditorProps {
  content: string;
  editable?: boolean;
  onChange: (html: string) => void;
  editorRef?: (editor: Editor | null) => void;
}

export function RichTextEditor({
  content,
  editable = true,
  onChange,
  editorRef,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      NoteImage,
      NoteAttachment,
      Placeholder.configure({
        placeholder: "Start writing…",
      }),
    ],
    content: content || "",
    editorProps: {
      attributes: {
        class:
          "tiptap-editor prose prose-sm prose-invert max-w-none min-h-[50vh] w-full focus:outline-none text-base leading-relaxed text-zinc-200",
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (editable) onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    editorRef?.(editor);
  }, [editor, editorRef]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  if (!editor) {
    return (
      <div className="min-h-[50vh] text-ui-meta">Loading editor…</div>
    );
  }

  return <EditorContent editor={editor} />;
}
