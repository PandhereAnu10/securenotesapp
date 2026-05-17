import { Router } from "express";
import { getOpenApi, getAbout } from "../controllers/meta.controller";

const router = Router();

router.get("/openapi.json", getOpenApi);
router.get("/about", getAbout);

export default router;
