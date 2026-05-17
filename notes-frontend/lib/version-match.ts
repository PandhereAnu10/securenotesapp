/** True when a ledger snapshot matches the note the user is viewing right now. */
export function isCurrentNoteVersion(
  snapshot: { title: string; content: string },
  currentTitle: string,
  currentContent: string
): boolean {
  return (
    snapshot.title === currentTitle &&
    normalizeNoteHtml(snapshot.content) === normalizeNoteHtml(currentContent)
  );
}

/**
 * Among ledger entries (newest first), return the id of the single active snapshot
 * that matches the live note — only the latest matching save counts as "current".
 */
export function findActiveVersionEntryId(
  entries: { id: string; title: string; content: string }[],
  currentTitle: string,
  currentContent: string
): string | null {
  const match = entries.find((entry) =>
    isCurrentNoteVersion(entry, currentTitle, currentContent)
  );
  return match?.id ?? null;
}

function normalizeNoteHtml(html: string): string {
  return (html ?? "")
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .trim();
}
