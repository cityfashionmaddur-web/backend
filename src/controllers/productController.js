import { prisma } from '../config/prismaClient.js';
import slugify from 'slugify';
import { r2 } from "../config/r2.js";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";

async function deleteImagesFromStorage(urls = []) {
  const base = process.env.R2_PUBLIC_URL || "";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  const keys = urls
    .map((url) => {
      if (!prefix) return null;
      if (url.startsWith(prefix)) return url.replace(prefix, "");
      // try without trailing slash match for legacy stored URLs
      const noSlash = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
      return url.startsWith(noSlash) ? url.replace(noSlash, "").replace(/^\/+/, "") : null;
    })
    .filter(Boolean)
    .map((Key) => ({ Key }));

  if (!keys.length) return;

  try {
    await r2.send(
      new DeleteObjectsCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Delete: { Objects: keys }
      })
    );
  } catch (err) {
    console.error("Failed to delete product images from storage:", err);
  }
}

// Create Product (Admin Only)
export async function createProduct(req, res) {
  try {
    const { title, description, price, stock, images, categoryId } = req.body;

    if (!title || !price) {
      return res.status(400).json({ message: "Title and price are required" });
    }

    const slug = slugify(title, { lower: true, strict: true });

    const product = await prisma.product.create({
      data: {
        title,
        slug,
        description,
        price,
        stock,
        categoryId: categoryId ? Number(categoryId) : undefined,
        active: true,
        productImages: {
          create: images?.map((url) => ({ url })) || []
        }
      },
      include: { productImages: true }
    });

    res.json(product);
  } catch (err) {
    console.error("Create product error:", err);
    res.status(500).json({ message: "Failed to create product" });
  }
}

// Get all products (Public)
export async function getProducts(req, res) {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      include: { productImages: true, category: true },
      orderBy: { id: 'desc' }
    });

    res.json(products);
  } catch (err) {
    console.error("Products error:", err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
}

// Get product by slug (Public)
export async function getProductBySlug(req, res) {
  try {
    const { slug } = req.params;

    const product = await prisma.product.findUnique({
      where: { slug },
      include: { productImages: true, category: true }
    });

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json(product);
  } catch (err) {
    console.error("Slug error:", err);
    res.status(500).json({ message: "Failed to fetch product" });
  }
}

// Update Product (Admin Only)
export async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { images, ...data } = req.body;

    if (data.categoryId) {
      data.categoryId = Number(data.categoryId);
    }

    const updateData = { ...data };

    if (Array.isArray(images)) {
      updateData.productImages = {
        deleteMany: {},
        create: images.map((url) => ({ url }))
      };
    }

    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: updateData,
      include: { productImages: true, category: true }
    });

    res.json(product);
  } catch (err) {
    console.error("Update product error:", err);
    res.status(500).json({ message: "Failed to update product" });
  }
}

// Delete Product (Admin Only)
export async function deleteProduct(req, res) {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: { productImages: true }
    });

    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { productId: Number(id) } }),
      prisma.productImage.deleteMany({ where: { productId: Number(id) } }),
      prisma.product.delete({ where: { id: Number(id) } })
    ]);

    if (product?.productImages?.length) {
      const urls = product.productImages.map((img) => img.url);
      await deleteImagesFromStorage(urls);
    }

    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ message: "Failed to delete product" });
  }
}
