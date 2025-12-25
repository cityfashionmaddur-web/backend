import { prisma } from "../config/prismaClient.js";

// Public: List active slides
export async function listSlides(req, res) {
  try {
    const slides = await prisma.heroSlide.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" }
    });
    res.json(slides);
  } catch (err) {
    console.error("listSlides error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Admin: List all slides
export async function getAdminSlides(req, res) {
  try {
    const slides = await prisma.heroSlide.findMany({
      orderBy: { sortOrder: "asc" }
    });
    res.json(slides);
  } catch (err) {
    console.error("getAdminSlides error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Admin: Get by ID
export async function getSlideById(req, res) {
  try {
    const { id } = req.params;
    const slide = await prisma.heroSlide.findUnique({
      where: { id: Number(id) }
    });
    if (!slide) return res.status(404).json({ message: "Slide not found" });
    res.json(slide);
  } catch (err) {
    console.error("getSlideById error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// Admin: Create
export async function createSlide(req, res) {
  try {
    const data = req.body;
    console.log("Creating slide with data:", data);
    // Basic validation
    if (!data.title || !data.image) {
      return res.status(400).json({ message: "Title and Image are required" });
    }

    const slide = await prisma.heroSlide.create({
      data: {
        ...data,
        sortOrder: data.sortOrder ? Number(data.sortOrder) : 0,
        active: data.active !== undefined ? data.active : true
      }
    });
    res.json(slide);
  } catch (err) {
    console.log("createSlide error:", err);
    res.status(500).json({ message: "Failed to create slide" });
  }
}

// Admin: Update
export async function updateSlide(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;

    const slide = await prisma.heroSlide.update({
      where: { id: Number(id) },
      data: {
        ...data,
        sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : undefined
      }
    });
    res.json(slide);
  } catch (err) {
    console.error("updateSlide error:", err);
    res.status(500).json({ message: "Failed to update slide" });
  }
}

// Admin: Delete
export async function deleteSlide(req, res) {
  try {
    const { id } = req.params;
    await prisma.heroSlide.delete({ where: { id: Number(id) } });
    res.json({ message: "Slide deleted" });
  } catch (err) {
    console.error("deleteSlide error:", err);
    res.status(500).json({ message: "Failed to delete slide" });
  }
}
