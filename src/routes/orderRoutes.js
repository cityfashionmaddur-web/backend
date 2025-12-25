import { Router } from "express";
import { authRequired } from "../middleware/authMiddleware.js";
import { cancelMyPendingOrder, createOrder, getMyOrderById, getMyOrders } from "../controllers/orderController.js";

const router = Router();

router.post("/", authRequired, createOrder);
router.get("/", authRequired, getMyOrders);
router.get("/:id", authRequired, getMyOrderById);
router.post("/:id/cancel", authRequired, cancelMyPendingOrder);

export default router;
