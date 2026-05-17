/** Use string literals so runtime works even if Prisma enums fail to load. */
export const SHARE_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
} as const;

export const SHARE_ROLE = {
  VIEWER: "VIEWER",
  EDITOR: "EDITOR",
} as const;

export type ShareStatusValue = (typeof SHARE_STATUS)[keyof typeof SHARE_STATUS];
export type ShareRoleValue = (typeof SHARE_ROLE)[keyof typeof SHARE_ROLE];
