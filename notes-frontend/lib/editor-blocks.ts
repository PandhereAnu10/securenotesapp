import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";

const BLOCK_TYPES = new Set(["noteAttachment", "image"]);

/** Delete the selected attachment, drawing, or image block. */
export function deleteSelectedBlockFromEditor(editor: Editor): boolean {
  const { state } = editor;
  const { selection } = state;

  if (selection instanceof NodeSelection && BLOCK_TYPES.has(selection.node.type.name)) {
    editor.chain().focus().deleteSelection().run();
    return true;
  }

  const $from = selection.$from;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (BLOCK_TYPES.has(node.type.name)) {
      const from = $from.before(depth);
      const to = $from.after(depth);
      editor.chain().focus().deleteRange({ from, to }).run();
      return true;
    }
  }

  let removed = false;
  state.doc.descendants((node, pos) => {
    if (removed || !BLOCK_TYPES.has(node.type.name)) return;
    if (selection.from >= pos && selection.from <= pos + node.nodeSize) {
      editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
      removed = true;
    }
  });

  return removed;
}
