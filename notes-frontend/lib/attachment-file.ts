export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  if (!base64) throw new Error("Invalid data URL");

  const mimeMatch = /data:([^;]+);/.exec(header);
  const mime = mimeMatch?.[1] ?? "application/octet-stream";

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export function downloadAttachment(dataUrl: string, fileName: string): void {
  if (!dataUrl?.startsWith("data:")) {
    throw new Error("Missing file data");
  }
  const blob = dataUrlToBlob(dataUrl);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName || "download";
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export function openAttachment(dataUrl: string): void {
  if (!dataUrl?.startsWith("data:")) {
    throw new Error("Missing file data");
  }
  const blob = dataUrlToBlob(dataUrl);
  const objectUrl = URL.createObjectURL(blob);
  const opened = window.open(objectUrl, "_blank", "noopener,noreferrer");
  if (!opened) {
    URL.revokeObjectURL(objectUrl);
    throw new Error("Popup blocked — allow popups or use Download");
  }
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
