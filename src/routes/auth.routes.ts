import { Router } from "express";
import { register, login, googleAuth, getAuthConfig } from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  registerSchema,
  loginSchema,
  googleAuthSchema,
} from "../validators/auth.schema";

const router = Router();

router.get("/auth/config", asyncHandler(getAuthConfig));
router.post("/register", validateBody(registerSchema), asyncHandler(register));
router.post("/login", validateBody(loginSchema), asyncHandler(login));
router.post("/auth/google", validateBody(googleAuthSchema), asyncHandler(googleAuth));

export default router;
