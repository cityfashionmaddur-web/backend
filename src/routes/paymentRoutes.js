import { Router } from "express";
import { createRazorpayOrder, handleRazorpayWebhook } from "../controllers/paymentController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/razorpay/order", authRequired, createRazorpayOrder);
router.post("/razorpay/webhook", handleRazorpayWebhook);

export default router;
