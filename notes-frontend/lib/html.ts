/** Strip HTML tags for plain-text previews. */
export function stripHtml(html: string): string {
  if (!html) return "";
  if (typeof document !== "undefined") {
    const el = document.createElement("div");
    el.innerHTML = html;
    return (el.textContent ?? "").replace(/\s+/g, " ").trim();
  }
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeHtmlAttr(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Short subtitle for the notes list — one line only: excerpt, file count, or Empty. */
export function getNoteListSubtitle(html: string): string {
  if (!html?.trim()) return "Empty";

  const attachmentCount = (html.match(/data-type="note-attachment"/gi) ?? []).length;

  let work = html;
  work = work.replace(
    /<span[^>]*class="[^"]*note-attachment-payload[^"]*"[^>]*>[\s\S]*?<\/span>/gi,
    ""
  );
  work = work.replace(/<div[^>]*data-type="note-attachment"[\s\S]*?<\/div>/gi, "");
  work = work.replace(/<img[^>]*\/?>/gi, " ");

  let plain = stripHtml(work);
  plain = plain.replace(/data:[a-z0-9+/.;=,-]+/gi, " ");
  plain = plain.replace(/\s+/g, " ").trim();

  if (plain.length > 0) {
    return plain.length > 72 ? `${plain.slice(0, 72)}…` : plain;
  }

  if (attachmentCount > 0) {
    return attachmentCount === 1 ? "1 file attached" : `${attachmentCount} files attached`;
  }

  return "Empty";
}

/** Human-readable preview for version history (no base64 blobs). */
export function getNotePreviewText(html: string): string {
  if (!html?.trim()) return "";

  const attachmentNames: string[] = [];
  const attachmentRe =
    /data-type="note-attachment"[^>]*data-file-name="([^"]*)"/gi;
  let match: RegExpExecArray | null;
  while ((match = attachmentRe.exec(html)) !== null) {
    const name = decodeHtmlAttr(match[1]).trim();
    if (name) attachmentNames.push(name);
  }

  let work = html;
  work = work.replace(
    /<span[^>]*class="[^"]*note-attachment-payload[^"]*"[^>]*>[\s\S]*?<\/span>/gi,
    ""
  );
  work = work.replace(
    /<div[^>]*data-type="note-attachment"[\s\S]*?<\/div>/gi,
    ""
  );

  work = work.replace(/<img[^>]*data-drawing="true"[^>]*\/?>/gi, " ");
  work = work.replace(/<img[^>]*\/?>/gi, " ");

  let plain = stripHtml(work);
  plain = plain.replace(/data:[a-z0-9+/.;=,-]+/gi, " ");
  plain = plain.replace(/\s+/g, " ").trim();

  const parts: string[] = [];
  if (plain) parts.push(plain);
  for (const name of attachmentNames) {
    parts.push(`Attached: ${name}`);
  }

  const drawingCount = (html.match(/data-drawing="true"/gi) ?? []).length;
  const imageCount = (html.match(/<img\b/gi) ?? []).length - drawingCount;
  if (drawingCount > 0) {
    parts.push(drawingCount === 1 ? "Drawing" : `${drawingCount} drawings`);
  }
  if (imageCount > 0) {
    parts.push(imageCount === 1 ? "Image" : `${imageCount} images`);
  }

  const unique = [...new Set(parts.map((p) => p.trim()).filter(Boolean))];
  return unique.join(" · ") || "";
}
