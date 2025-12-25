import { Router } from "express";
import {
  createProduct,
  getProducts,
  getProductBySlug,
  updateProduct,
  deleteProduct
} from "../controllers/productController.js";

import { authRequired, adminOnly } from "../middleware/authMiddleware.js";

const router = Router();

// Admin Routes
router.post("/", authRequired, adminOnly, createProduct);
router.put("/:id", authRequired, adminOnly, updateProduct);
router.delete("/:id", authRequired, adminOnly, deleteProduct);

// Public Routes
router.get("/", getProducts);
router.get("/:slug", getProductBySlug);

export default router;
