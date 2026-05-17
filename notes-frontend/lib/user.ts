import { getToken } from "./auth-token";

export interface AuthUser {
  userId: string;
  email: string;
}

export function getAuthUser(): AuthUser | null {
  const token = getToken();
  if (!token) return null;

  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    const json = atob(segment.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { userId?: string; email?: string };
    if (!payload.email) return null;
    return {
      userId: payload.userId ?? "",
      email: payload.email,
    };
  } catch {
    return null;
  }
}

/** e.g. anu@test.com → "Anu", jane.doe@firm.com → "Jane" */
export function getDisplayNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim() ?? email;
  const segment = local.split(/[._-]+/)[0] ?? local;
  if (!segment) return "User";
  return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
}

export function getInitialFromEmail(email: string): string {
  const name = getDisplayNameFromEmail(email);
  return name.charAt(0).toUpperCase() || email.charAt(0).toUpperCase();
}
