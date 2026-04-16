import { prisma } from "../config/prismaClient.js";
import slugify from "slugify";

// ---- ADMIN CRUD ----

export async function getCollections(req, res) {
  try {
    const collections = await prisma.collection.findMany({
      include: { categories: { select: { id: true, name: true, slug: true } } },
      orderBy: { sortOrder: "asc" }
    });
    res.json(collections);
  } catch (err) {
    console.error("getCollections error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getCollectionById(req, res) {
  try {
    const collection = await prisma.collection.findUnique({
      where: { id: Number(req.params.id) },
      include: { categories: { select: { id: true, name: true, slug: true } } }
    });
    if (!collection) return res.status(404).json({ message: "Not found" });
    res.json(collection);
  } catch (err) {
    console.error("getCollectionById error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function createCollection(req, res) {
  try {
    const { name, sortOrder, active, showInNav, categoryIds } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });

    const slug = slugify(name, { lower: true, strict: true });

    const collection = await prisma.collection.create({
      data: {
        name: name.trim(),
        slug,
        sortOrder: Number(sortOrder) || 0,
        active: active !== false,
        showInNav: showInNav !== false
      }
    });

    // Link categories to this collection
    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      await prisma.category.updateMany({
        where: { id: { in: categoryIds.map(Number) } },
        data: { collectionId: collection.id }
      });
    }

    const result = await prisma.collection.findUnique({
      where: { id: collection.id },
      include: { categories: { select: { id: true, name: true, slug: true } } }
    });

    res.status(201).json(result);
  } catch (err) {
    console.error("createCollection error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateCollection(req, res) {
  try {
    const { id } = req.params;
    const { name, sortOrder, active, showInNav, categoryIds } = req.body;

    const updateData = {};
    if (name !== undefined) {
      updateData.name = name.trim();
      updateData.slug = slugify(name, { lower: true, strict: true });
    }
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);
    if (active !== undefined) updateData.active = Boolean(active);
    if (showInNav !== undefined) updateData.showInNav = Boolean(showInNav);

    await prisma.collection.update({
      where: { id: Number(id) },
      data: updateData
    });

    // Re-link categories: unlink old ones, link new ones
    if (Array.isArray(categoryIds)) {
      // Unlink all categories from this collection
      await prisma.category.updateMany({
        where: { collectionId: Number(id) },
        data: { collectionId: null }
      });
      // Link the provided category IDs
      if (categoryIds.length > 0) {
        await prisma.category.updateMany({
          where: { id: { in: categoryIds.map(Number) } },
          data: { collectionId: Number(id) }
        });
      }
    }

    const result = await prisma.collection.findUnique({
      where: { id: Number(id) },
      include: { categories: { select: { id: true, name: true, slug: true } } }
    });

    res.json(result);
  } catch (err) {
    console.error("updateCollection error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function deleteCollection(req, res) {
  try {
    const { id } = req.params;
    // Unlink categories first
    await prisma.category.updateMany({
      where: { collectionId: Number(id) },
      data: { collectionId: null }
    });
    await prisma.collection.delete({ where: { id: Number(id) } });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("deleteCollection error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ---- PUBLIC: Navbar collections ----

export async function getNavCollections(req, res) {
  try {
    const collections = await prisma.collection.findMany({
      where: { active: true, showInNav: true },
      include: {
        categories: {
          select: { id: true, name: true, slug: true },
          orderBy: { name: "asc" }
        }
      },
      orderBy: { sortOrder: "asc" }
    });
    res.json(collections);
  } catch (err) {
    console.error("getNavCollections error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
