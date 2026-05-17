import axios, { type AxiosError } from "axios";
import { clearToken, getToken, setToken } from "./auth-token";
import type { AuditLedgerEntry, Collaborator, Note, PendingInvite } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 120_000,
  maxContentLength: 20 * 1024 * 1024,
  maxBodyLength: 20 * 1024 * 1024,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      clearToken();
      const path = window.location.pathname;
      if (!path.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (email: string, password: string) =>
    api.post<{ message: string }>("/register", { email, password }),

  login: async (email: string, password: string) => {
    const { data } = await api.post<{ access_token: string }>("/login", {
      email,
      password,
    });
    setToken(data.access_token);
    return data;
  },

  googleLogin: async (credential: string) => {
    const { data } = await api.post<{ access_token: string }>("/auth/google", {
      credential,
    });
    setToken(data.access_token);
    return data;
  },

  logout: () => {
    clearToken();
  },
};

export const invitesApi = {
  list: () => api.get<PendingInvite[]>("/invites"),
  accept: (inviteId: string) =>
    api.post<{ message: string }>(`/invites/${inviteId}/accept`),
  decline: (inviteId: string) =>
    api.post<{ message: string }>(`/invites/${inviteId}/decline`),
};

export const notesApi = {
  list: () => api.get<Note[]>("/notes"),
  get: (id: string) => api.get<Note>(`/notes/${id}`),
  create: (payload: { title: string; content: string }) =>
    api.post<Note>("/notes", payload),
  update: (id: string, payload: { title: string; content: string }) =>
    api.put<Note>(`/notes/${id}`, payload),
  delete: (id: string) => api.delete(`/notes/${id}`),
  share: (id: string, share_with_email: string, role: "VIEWER" | "EDITOR") =>
    api.post<{ message: string }>(`/notes/${id}/share`, {
      share_with_email,
      role,
    }),
  getCollaborators: (id: string) =>
    api.get<Collaborator[]>(`/notes/${id}/collaborators`),
  getAuditLedger: (id: string) =>
    api.get<AuditLedgerEntry[]>(`/notes/${id}/audit-ledger`),
  restore: (id: string, ledger_id: string) =>
    api.post<{ message: string; note: Note }>(`/notes/${id}/restore`, {
      ledger_id,
    }),
  pin: (id: string, pinned: boolean) =>
    api.patch<{ message: string; note: Note }>(`/notes/${id}/pin`, { pinned }),
};

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: string }
      | undefined;
    return (
      data?.error ??
      data?.message ??
      error.message ??
      "Request failed"
    );
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
