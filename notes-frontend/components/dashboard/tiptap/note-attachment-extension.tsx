"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { Download, ExternalLink, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { downloadAttachment, openAttachment } from "@/lib/attachment-file";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PAYLOAD_CLASS = "note-attachment-payload";

const actionButtonClass =
  "h-8 rounded-none border border-zinc-500 bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90 disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500";

function formatFileSize(dataUrl: string): string {
  const base64 = dataUrl.split(",")[1];
  if (!base64) return "";
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readPayloadFromElement(el: HTMLElement): string {
  const hidden = el.querySelector(`.${PAYLOAD_CLASS}`);
  const fromChild = hidden?.textContent?.trim();
  if (fromChild?.startsWith("data:")) return fromChild;
  const fromAttr = el.getAttribute("data-data-url");
  if (fromAttr?.startsWith("data:")) return fromAttr;
  return "";
}

function AttachmentNodeView({ node, selected, deleteNode, editor, getPos }: NodeViewProps) {
  const { fileName, fileType, dataUrl } = node.attrs as {
    fileName: string;
    fileType: string;
    dataUrl: string;
  };
  const isImage = fileType.startsWith("image/");
  const hasData = Boolean(dataUrl?.startsWith("data:"));
  const canOpenInBrowser =
    hasData &&
    (fileType.startsWith("image/") ||
      fileType === "application/pdf" ||
      fileType.startsWith("text/"));

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasData) {
      toast.error("File data missing", {
        description: "Re-attach this file or ask the note owner to share again.",
      });
      return;
    }
    try {
      downloadAttachment(dataUrl, fileName);
    } catch {
      toast.error("Download failed");
    }
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasData) {
      toast.error("File data missing");
      return;
    }
    try {
      openAttachment(dataUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open file");
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getPos();
    if (typeof pos === "number" && editor) {
      editor
        .chain()
        .focus()
        .deleteRange({ from: pos, to: pos + node.nodeSize })
        .run();
      return;
    }
    deleteNode();
  };

  const handleSelect = () => {
    const pos = getPos();
    if (typeof pos === "number" && editor) {
      editor.chain().focus().setNodeSelection(pos).run();
    }
  };

  const removeButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
      onMouseDown={(e) => e.preventDefault()}
      onClick={handleRemove}
      aria-label="Remove attachment"
    >
      <X className="h-3.5 w-3.5" />
    </Button>
  );

  const actionButtons = (
    <div className="flex flex-wrap gap-1.5">
      <Button
        type="button"
        size="sm"
        className={actionButtonClass}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleDownload}
        disabled={!hasData}
      >
        <Download className="mr-1.5 h-3.5 w-3.5" />
        Download
      </Button>
      {canOpenInBrowser && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 rounded-none border border-zinc-500 bg-zinc-900 px-3 text-xs font-medium text-zinc-100 hover:bg-zinc-800"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleOpen}
        >
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
          Open
        </Button>
      )}
    </div>
  );

  return (
    <NodeViewWrapper
      as="div"
      className={cn(
        "note-attachment-block my-2 max-w-md font-sans",
        selected && "ring-2 ring-amber-500/90"
      )}
      contentEditable={false}
      onClick={handleSelect}
    >
      {isImage ? (
        <div className="overflow-hidden border border-zinc-600 bg-zinc-950">
          {hasData ? (
            <img
              src={dataUrl}
              alt={fileName}
              className="max-h-40 w-full object-contain"
            />
          ) : (
            <div className="px-3 py-4 text-center text-xs text-zinc-400">
              Image unavailable
            </div>
          )}
          <div className="border-t border-zinc-600 bg-zinc-900/80 px-3 py-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-medium text-zinc-100">{fileName}</p>
              {removeButton}
            </div>
            {actionButtons}
          </div>
        </div>
      ) : (
        <div className="border border-zinc-600 bg-zinc-950 px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-ui-label">Attachment</span>
            {removeButton}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-zinc-600 bg-black">
                <FileText className="h-4 w-4 text-zinc-200" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-100">{fileName}</p>
                <p className="text-ui-caption">
                  {fileType || "File"}
                  {hasData ? ` · ${formatFileSize(dataUrl)}` : " · missing"}
                </p>
              </div>
            </div>
            {actionButtons}
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}

export const NoteAttachment = Node.create({
  name: "noteAttachment",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      fileName: { default: "" },
      fileType: { default: "application/octet-stream" },
      dataUrl: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="note-attachment"]',
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          const dataUrl = readPayloadFromElement(el);
          return {
            fileName: el.getAttribute("data-file-name") ?? "",
            fileType: el.getAttribute("data-file-type") ?? "application/octet-stream",
            dataUrl,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const fileName = node.attrs.fileName as string;
    const fileType = node.attrs.fileType as string;
    const dataUrl = node.attrs.dataUrl as string;

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "note-attachment",
        "data-file-name": fileName,
        "data-file-type": fileType,
        class: "note-attachment-block",
        contenteditable: "false",
      }),
      ["span", { class: PAYLOAD_CLASS, style: "display:none" }, dataUrl],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AttachmentNodeView);
  },
});
