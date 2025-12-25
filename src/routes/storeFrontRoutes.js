import { Router } from "express";
import {
  listProducts,
  getProductBySlug,
  searchProducts,
  filterProducts,
  getRelatedProducts,
  listCategories,
  getCategoryWithProducts,
  inventoryByIds,
  listShippingTiers
} from "../controllers/storeFrontController.js";
import { listSlides } from "../controllers/heroController.js";

const router = Router();

router.get("/hero", listSlides);
router.get("/shipping-tiers", listShippingTiers);

router.get("/products", listProducts);
router.get("/products/inventory", inventoryByIds);
router.get("/products/search", searchProducts);
router.get("/products/filter", filterProducts);
router.get("/products/related/:id", getRelatedProducts);
router.get("/products/:slug", getProductBySlug);

router.get("/categories", listCategories);
router.get("/categories/:slug", getCategoryWithProducts);

export default router;
