import { Router } from "express";
import { adminPasswordLogin, adminLogout } from "../controllers/adminAuthController.js";

const router = Router();

router.post("/login", adminPasswordLogin);
router.post("/logout", adminLogout);

export default router;
