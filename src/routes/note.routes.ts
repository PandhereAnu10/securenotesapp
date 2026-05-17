import { Router } from "express";
import {
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  shareNote,
  listCollaborators,
  pinNote,
  getNoteAuditLedger,
  restoreNoteVersion,
} from "../controllers/note.controller";
import { protectedRoute } from "../middleware/protectedRoute";
import { validateBody } from "../middleware/validate";
import { validateParams } from "../middleware/validateParams";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  createNoteSchema,
  updateNoteSchema,
  shareNoteSchema,
  pinNoteSchema,
  noteIdParamSchema,
  restoreNoteSchema,
} from "../validators/note.schema";

const router = Router();

router.use(protectedRoute);

router.get("/", asyncHandler(listNotes));
router.post("/", validateBody(createNoteSchema), asyncHandler(createNote));
router.get(
  "/:id",
  validateParams(noteIdParamSchema),
  asyncHandler(getNote)
);
router.put(
  "/:id",
  validateParams(noteIdParamSchema),
  validateBody(updateNoteSchema),
  asyncHandler(updateNote)
);
router.delete(
  "/:id",
  validateParams(noteIdParamSchema),
  asyncHandler(deleteNote)
);
router.get(
  "/:id/collaborators",
  validateParams(noteIdParamSchema),
  asyncHandler(listCollaborators)
);
router.post(
  "/:id/share",
  validateParams(noteIdParamSchema),
  validateBody(shareNoteSchema),
  asyncHandler(shareNote)
);
router.patch(
  "/:id/pin",
  validateParams(noteIdParamSchema),
  validateBody(pinNoteSchema),
  asyncHandler(pinNote)
);
router.get(
  "/:id/audit-ledger",
  validateParams(noteIdParamSchema),
  asyncHandler(getNoteAuditLedger)
);
router.post(
  "/:id/restore",
  validateParams(noteIdParamSchema),
  validateBody(restoreNoteSchema),
  asyncHandler(restoreNoteVersion)
);

export default router;
