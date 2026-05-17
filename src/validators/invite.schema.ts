import { z } from "zod";

export const inviteIdParamSchema = z.object({
  id: z.string().uuid("Invalid invite id"),
});
