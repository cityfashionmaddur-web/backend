import { prisma } from "../config/prismaClient.js";

// ---------------------------
// GET PAGINATED PRODUCT LIST
// ---------------------------
export async function listProducts(req, res) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const q = req.query.q || "";
    const min = req.query.min ? Number(req.query.min) : null;
    const max = req.query.max ? Number(req.query.max) : null;
    const categorySlug = req.query.category || "";

    const sort = req.query.sort || "newest";

    let orderBy = { id: "desc" }; // default newest

    if (sort === "price_asc") orderBy = { price: "asc" };
    if (sort === "price_desc") orderBy = { price: "desc" };

    const filters = {
      active: true
    };

    if (q) {
      filters.title = {
        contains: q,
        mode: "insensitive"
      };
    }

    if (min !== null || max !== null) {
      filters.price = {
        gte: min ?? 0,
        lte: max ?? 999999
      };
    }

    if (categorySlug) {
      filters.category = {
        slug: categorySlug
      };
    }

    if (req.query.ids) {
      const ids = req.query.ids
        .split(",")
        .map((id) => Number(id.trim()))
        .filter((id) => !isNaN(id));
      if (ids.length > 0) {
        filters.id = { in: ids };
      }
    }

    const [products, total, priceBounds, categoryCounts] = await Promise.all([
      prisma.product.findMany({
        where: filters,
        include: { productImages: true, category: true },
        skip,
        take: limit,
        orderBy
      }),
      prisma.product.count({ where: filters }),
      prisma.product.aggregate({
        where: { active: true },
        _min: { price: true },
        _max: { price: true }
      }),
      prisma.category.findMany({
        include: {
          _count: { select: { products: true } }
        },
        orderBy: { name: "asc" }
      })
    ]);

    res.json({
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      priceRange: {
        min: priceBounds?._min?.price ?? 0,
        max: priceBounds?._max?.price ?? 0
      },
      categories: categoryCounts,
      products
    });

  } catch (err) {
    console.error("listProducts error:", err);
    res.status(500).json({ message: "Server error" });
  }
}



// ---------------------------
// GET PRODUCT BY SLUG
// ---------------------------
export async function getProductBySlug(req, res) {
  try {
    const { slug } = req.params;

    const product = await prisma.product.findUnique({
      where: { slug },
      include: { productImages: true, category: true }
    });

    if (!product)
      return res.status(404).json({ message: "Product not found" });

    const related = await prisma.product.findMany({
      where: {
        id: { not: product.id },
        active: true,
        categoryId: product.categoryId ?? undefined
      },
      include: { productImages: true, category: true },
      take: 6,
      orderBy: { id: "desc" }
    });

    res.json({ ...product, related });

  } catch (err) {
    console.error("getProductBySlug error:", err);
    res.status(500).json({ message: "Server error" });
  }
}



// ---------------------------
// SEARCH PRODUCTS
// ---------------------------
export async function searchProducts(req, res) {
  try {
    const q = req.query.q || "";

    const results = await prisma.product.findMany({
      where: {
        active: true,
        title: {
          contains: q,
          mode: "insensitive"
        }
      },
      include: { productImages: true, category: true },
      take: 50
    });

    res.json(results);

  } catch (err) {
    console.error("searchProducts error:", err);
    res.status(500).json({ message: "Server error" });
  }
}



// ---------------------------
// FILTER PRODUCTS BY PRICE RANGE
// ---------------------------
export async function filterProducts(req, res) {
  try {
    const min = req.query.min ? Number(req.query.min) : 0;
    const max = req.query.max ? Number(req.query.max) : 999999;

    const results = await prisma.product.findMany({
      where: {
        active: true,
        price: {
          gte: min,
          lte: max
        }
      },
      include: { productImages: true, category: true }
    });

    res.json(results);

  } catch (err) {
    console.error("filterProducts error:", err);
    res.status(500).json({ message: "Server error" });
  }
}



// ---------------------------
// RELATED PRODUCTS
// ---------------------------
export async function getRelatedProducts(req, res) {
  try {
    const { id } = req.params;

    const baseProduct = await prisma.product.findUnique({
      where: { id: Number(id) }
    });

    if (!baseProduct)
      return res.status(404).json({ message: "Product not found" });

    const results = await prisma.product.findMany({
      where: {
        id: { not: baseProduct.id },
        active: true,
        price: {
          gte: Number(baseProduct.price) - 200,
          lte: Number(baseProduct.price) + 200
        }
      },
      include: { productImages: true, category: true },
      take: 6
    });

    res.json(results);

  } catch (err) {
    console.error("getRelatedProducts error:", err);
    res.status(500).json({ message: "Server error" });
  }
}


// ---------------------------
// INVENTORY BY IDS
// ---------------------------
export async function inventoryByIds(req, res) {
  try {
    const ids = (req.query.ids || "")
      .split(",")
      .map((id) => Number(id.trim()))
      .filter((id) => !isNaN(id));

    if (!ids.length) return res.json({ products: [] });

    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, stock: true, price: true, title: true, slug: true }
    });

    res.json({ products });
  } catch (err) {
    console.error("inventoryByIds error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ---------------------------
// SHIPPING TIERS / ETA
// ---------------------------
export function listShippingTiers(_req, res) {
  res.json({
    tiers: [
      { min: 0, max: 500, fee: 50, etaDays: "4-6" },
      { min: 501, max: 2500, fee: 100, etaDays: "3-5" },
      { min: 2501, max: 5000, fee: 200, etaDays: "2-4" },
      { min: 5001, max: 999999, fee: 0, etaDays: "2-4", label: "Free delivery" }
    ]
  });
}



// ---------------------------
// CATEGORIES (PUBLIC)
// ---------------------------
export async function listCategories(req, res) {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { products: true } }
      },
      orderBy: { name: "asc" }
    });

    res.json(categories);
  } catch (err) {
    console.error("listCategories error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getCategoryWithProducts(req, res) {
  try {
    const { slug } = req.params;

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        products: {
          where: { active: true },
          include: { productImages: true, category: true },
          orderBy: { id: "desc" }
        }
      }
    });

    if (!category)
      return res.status(404).json({ message: "Category not found" });

    res.json(category);
  } catch (err) {
    console.error("getCategoryWithProducts error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
