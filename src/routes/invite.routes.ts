import { Router } from "express";
import {
  listInvites,
  acceptInvite,
  declineInvite,
} from "../controllers/invite.controller";
import { protectedRoute } from "../middleware/protectedRoute";
import { validateParams } from "../middleware/validateParams";
import { asyncHandler } from "../middleware/asyncHandler";
import { inviteIdParamSchema } from "../validators/invite.schema";

const router = Router();

router.use(protectedRoute);

router.get("/", asyncHandler(listInvites));
router.post(
  "/:id/accept",
  validateParams(inviteIdParamSchema),
  asyncHandler(acceptInvite)
);
router.post(
  "/:id/decline",
  validateParams(inviteIdParamSchema),
  asyncHandler(declineInvite)
);

export default router;
