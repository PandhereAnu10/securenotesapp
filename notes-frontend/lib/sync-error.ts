import axios from "axios";

export function getSyncErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    const serverMsg = data?.message ?? data?.error;

    if (status === 413) {
      return serverMsg ?? "Note is too large to save. Use a smaller attachment (under 2MB).";
    }
    if (status === 400 && serverMsg) return serverMsg;
    if (error.code === "ECONNABORTED") {
      return "Save timed out. Check your connection and try Save again.";
    }
    if (!error.response) {
      return "Cannot reach server. Is the API running on port 3000?";
    }
    return serverMsg ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return "Failed to save note";
}
