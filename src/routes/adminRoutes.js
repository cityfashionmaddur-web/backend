import { Router } from "express";
import { authRequired, adminOnly } from "../middleware/authMiddleware.js";
import {
  getAdminInfo,
  getDashboardStats,
  getAdminProducts,
  getAdminProductById,
  updateAdminProduct,
  deleteAdminProduct,
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
  updateOrderTracking,
  getAdminCustomers,
  getAdminCustomerById,
  getAdminCustomerOrders
} from "../controllers/adminController.js";
import { createProduct } from "../controllers/productController.js";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
} from "../controllers/categoryController.js";
import {
  getAdminSlides,
  getSlideById,
  createSlide,
  updateSlide,
  deleteSlide
} from "../controllers/heroController.js";

const router = Router();

// Admin Verification
router.get("/me", authRequired, adminOnly, getAdminInfo);

// Dashboard stats
router.get("/stats", authRequired, adminOnly, getDashboardStats);

// Products
router.post("/products", authRequired, adminOnly, createProduct);
router.get("/products", authRequired, adminOnly, getAdminProducts);
router.get("/products/:id", authRequired, adminOnly, getAdminProductById);
router.put("/products/:id", authRequired, adminOnly, updateAdminProduct);
router.delete("/products/:id", authRequired, adminOnly, deleteAdminProduct);

// Orders
router.get("/orders", authRequired, adminOnly, getAdminOrders);
router.get("/orders/:id", authRequired, adminOnly, getAdminOrderById);
router.put("/orders/:id/status", authRequired, adminOnly, updateOrderStatus);
router.put("/orders/:id/tracking", authRequired, adminOnly, updateOrderTracking);

// Customers
router.get("/customers", authRequired, adminOnly, getAdminCustomers);
router.get("/customers/:id", authRequired, adminOnly, getAdminCustomerById);
router.get("/customers/:id/orders", authRequired, adminOnly, getAdminCustomerOrders);

// Categories
router.get("/categories", authRequired, adminOnly, getCategories);
router.get("/categories/:id", authRequired, adminOnly, getCategoryById);
router.post("/categories", authRequired, adminOnly, createCategory);
router.put("/categories/:id", authRequired, adminOnly, updateCategory);
router.delete("/categories/:id", authRequired, adminOnly, deleteCategory);

// Hero Slides
router.get("/hero", authRequired, adminOnly, getAdminSlides);
router.get("/hero/:id", authRequired, adminOnly, getSlideById);
router.post("/hero", authRequired, adminOnly, createSlide);
router.put("/hero/:id", authRequired, adminOnly, updateSlide);
router.delete("/hero/:id", authRequired, adminOnly, deleteSlide);

export default router;
