import { prisma } from "../config/prismaClient.js";
import crypto from "crypto";

function buildAddressSnapshot(user, body = {}) {
  return {
    addressLine1: body.addressLine1 || user.addressLine1 || null,
    addressLine2: body.addressLine2 || user.addressLine2 || null,
    city: body.city || user.city || null,
    state: body.state || user.state || null,
    postalCode: body.postalCode || user.postalCode || null,
    country: body.country || user.country || null,
    phone: body.phone || user.phone || null
  };
}

function calculateShipping(subtotal) {
  if (subtotal <= 0) return 0;
  if (subtotal <= 500) return 50;
  if (subtotal <= 2500) return 100;
  if (subtotal <= 3500) return 200;
  if (subtotal <= 5000) return 300;
  if (subtotal <= 7000) return 400;
  return 500;
}

function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  if (!orderId || !paymentId || !signature || !process.env.RAZORPAY_KEY_SECRET) return false;
  const payload = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest("hex");
  return expected === signature;
}

export async function createOrder(req, res) {
  try {
    const { items = [], paymentId, razorpayOrderId, razorpaySignature, paymentMethod = "razorpay" } = req.body;

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: "No items provided" });
    }

    const productIds = items.map((i) => Number(i.productId)).filter(Boolean);
    if (!productIds.length) return res.status(400).json({ message: "Invalid items" });

    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
      include: { productImages: true }
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const orderItemsData = [];
    let subtotal = 0;

    for (const item of items) {
      const pid = Number(item.productId);
      const qty = Math.max(Number(item.quantity) || 1, 1);
      const product = productMap.get(pid);
      if (!product) continue;
      const priceNum = Number(product.price);
      subtotal += priceNum * qty;
      orderItemsData.push({ productId: pid, quantity: qty, price: priceNum, size: item.size || null, color: item.color || null });
    }

    if (!orderItemsData.length) return res.status(400).json({ message: "No valid items" });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(401).json({ message: "User not found" });

    const address = buildAddressSnapshot(user, req.body || {});
    try {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { ...address }
      });
    } catch (err) {
      console.warn("createOrder: failed to persist user address", err?.message);
    }

    const shippingFee = calculateShipping(subtotal);
    const totalAmount = subtotal + shippingFee;

    if (
      paymentMethod === "razorpay" &&
      (paymentId || razorpayOrderId || razorpaySignature) &&
      !verifyRazorpaySignature({
        orderId: razorpayOrderId,
        paymentId,
        signature: razorpaySignature
      })
    ) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    const isPaid =
      paymentMethod === "razorpay" &&
      paymentId &&
      razorpayOrderId &&
      razorpaySignature &&
      verifyRazorpaySignature({
        orderId: razorpayOrderId,
        paymentId,
        signature: razorpaySignature
      });

    const order = await prisma.$transaction(async (tx) => {
      // 1. Decrement stock for each item
      for (const item of orderItemsData) {
        try {
          if (item.size) {
            const variant = await tx.productVariant.findUnique({
              where: { productId_size: { productId: item.productId, size: item.size } }
            });
            if (!variant || variant.stock < item.quantity) {
              throw new Error(`Insufficient stock for product ID ${item.productId} size ${item.size}`);
            }
            await tx.productVariant.update({
              where: { productId_size: { productId: item.productId, size: item.size } },
              data: { stock: { decrement: item.quantity } }
            });
          } else {
             // Fallback for products without sizes if any exist
             const oldPr = await tx.product.findUnique({ where: { id: item.productId } });
             if (!oldPr) throw new Error(`Product not found`);
             // We don't have global stock anymore, so just let it pass if no size is specified
             // assuming it's an unlimited digital product or a legacy product.
          }
        } catch (err) {
          throw new Error(err.message.includes('Insufficient') ? err.message : `Insufficient stock for product ID ${item.productId}`);
        }
      }

      // 2. Create the order
      return tx.order.create({
        data: {
          userId: req.user.id,
          totalAmount,
          status: isPaid ? "PAID" : "PENDING",
          paymentId,
          razorpayOrderId,
          razorpaySignature,
          paymentMethod,
          ...address,
          items: {
            create: orderItemsData
          }
        },
        include: {
          items: true
        }
      });
    });

    res.json({ ...order, shippingFee });
  } catch (err) {
    console.error("createOrder error:", err);
    if (err.message.includes("Insufficient stock")) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: "Failed to create order" });
  }
}

export async function getMyOrders(req, res) {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      orderBy: { id: "desc" },
      include: {
        items: { include: { product: true } }
      }
    });

    res.json(orders);
  } catch (err) {
    console.error("getMyOrders error:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
}

export async function getMyOrderById(req, res) {
  try {
    const { id } = req.params;
    const order = await prisma.order.findFirst({
      where: { id: Number(id), userId: req.user.id },
      include: { items: { include: { product: true } } }
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json(order);
  } catch (err) {
    console.error("getMyOrderById error:", err);
    res.status(500).json({ message: "Failed to fetch order" });
  }
}

export async function cancelMyPendingOrder(req, res) {
  try {
    const id = Number(req.params.id);
    const order = await prisma.order.findFirst({
      where: { id, userId: req.user.id },
      include: { items: true }
    });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (["PAID", "SHIPPED", "DELIVERED", "CANCELLED"].includes(order.status)) {
      return res.status(400).json({ message: "Order cannot be cancelled" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status: "CANCELLED" }
      });

      for (const item of order.items) {
        if (item.size) {
          try {
            await tx.productVariant.update({
              where: { productId_size: { productId: item.productId, size: item.size } },
              data: { stock: { increment: item.quantity } }
            });
          } catch (e) {
            console.warn(`Failed to restore stock for cancelled order item ${item.id}`, e);
          }
        }
      }
      return updatedOrder;
    });

    res.json(updated);
  } catch (err) {
    console.error("cancelMyPendingOrder error:", err);
    res.status(500).json({ message: "Failed to cancel order" });
  }
}
