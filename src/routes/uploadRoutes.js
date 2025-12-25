import { Router } from "express";
import { getUploadUrl } from "../controllers/uploadController.js";
import { authRequired, adminOnly } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/image", authRequired, adminOnly, getUploadUrl);

export default router;
