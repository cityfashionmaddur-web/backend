import slugify from "slugify";
import { prisma } from "../config/prismaClient.js";

export async function createCategory(req, res) {
  try {
    const { name, description } = req.body;

    if (!name) return res.status(400).json({ message: "Name is required" });

    const slug = slugify(name, { lower: true, strict: true });

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description
      }
    });

    res.json(category);
  } catch (err) {
    console.error("createCategory error:", err);
    if (err.code === "P2002") {
      return res.status(409).json({ message: "Category name/slug already exists" });
    }
    res.status(500).json({ message: "Failed to create category" });
  }
}

export async function getCategories(req, res) {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { products: true } }
      },
      orderBy: { name: "asc" }
    });

    res.json(categories);
  } catch (err) {
    console.error("getCategories error:", err);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
}

export async function getCategoryById(req, res) {
  try {
    const { id } = req.params;
    const category = await prisma.category.findUnique({
      where: { id: Number(id) },
      include: { products: true }
    });

    if (!category) return res.status(404).json({ message: "Category not found" });

    res.json(category);
  } catch (err) {
    console.error("getCategoryById error:", err);
    res.status(500).json({ message: "Failed to fetch category" });
  }
}

export async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const data = { description };
    if (name) {
      data.name = name;
      data.slug = slugify(name, { lower: true, strict: true });
    }

    const category = await prisma.category.update({
      where: { id: Number(id) },
      data,
      include: { _count: { select: { products: true } } }
    });

    res.json(category);
  } catch (err) {
    console.error("updateCategory error:", err);
    if (err.code === "P2002") {
      return res.status(409).json({ message: "Category name/slug already exists" });
    }
    res.status(500).json({ message: "Failed to update category" });
  }
}

export async function deleteCategory(req, res) {
  try {
    const { id } = req.params;

    await prisma.category.delete({ where: { id: Number(id) } });

    res.json({ message: "Category deleted" });
  } catch (err) {
    console.error("deleteCategory error:", err);
    res.status(500).json({ message: "Failed to delete category" });
  }
}
