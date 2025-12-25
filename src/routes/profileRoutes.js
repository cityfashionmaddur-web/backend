import { Router } from "express";
import { authRequired } from "../middleware/authMiddleware.js";
import { getProfile, updateProfile } from "../controllers/profileController.js";

const router = Router();

router.get("/", authRequired, getProfile);
router.put("/", authRequired, updateProfile);

export default router;
