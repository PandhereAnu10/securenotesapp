function hasAttachment(html: string): boolean {
  return html.includes('data-type="note-attachment"');
}

/** Heuristic: apply server HTML without clobbering in-progress local edits. */
export function shouldApplyRemoteNoteContent(
  localContent: string,
  remoteContent: string
): boolean {
  const local = localContent ?? "";
  const remote = remoteContent ?? "";
  if (local === remote) return false;

  // Ignore empty/truncated server payloads when local note is substantial.
  if (remote.length === 0 && local.length > 80) return false;

  const localHasAttachment = hasAttachment(local);
  const remoteHasAttachment = hasAttachment(remote);

  // Local removed attachment; keep until server save reflects removal.
  if (!localHasAttachment && remoteHasAttachment) return false;

  // Server removed attachment (or collaborator view) — always accept.
  if (localHasAttachment && !remoteHasAttachment) return true;

  return true;
}

export function noteContentFingerprint(content: string): string {
  return `${content.length}:${content.slice(0, 64)}`;
}

export function countAttachments(html: string): number {
  return (html.match(/data-type="note-attachment"/gi) ?? []).length;
}
