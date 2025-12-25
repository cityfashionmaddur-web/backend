import Razorpay from "razorpay";
import crypto from "crypto";
import { prisma } from "../config/prismaClient.js";

const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET } = process.env;

function ensureRazorpay() {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay keys are not configured in env");
  }
  return new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
  });
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

async function persistUserAddress(userId, address) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        phone: address.phone
      }
    });
  } catch (err) {
    console.warn("Failed to persist user address", err?.message);
  }
}

export async function createRazorpayOrder(req, res) {
  try {
    const { items = [], currency = "INR", receipt } = req.body;

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: "No items provided" });
    }

    const productIds = items.map((i) => Number(i.productId)).filter(Boolean);
    if (!productIds.length) return res.status(400).json({ message: "Invalid items" });

    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, active: true }
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const orderItemsData = [];
    let subtotal = 0;

    for (const item of items) {
      const pid = Number(item.productId);
      const qty = Math.max(Number(item.quantity) || 1, 1);
      const product = productMap.get(pid);
      if (!product) continue;
      if (product.stock < qty) {
        return res.status(400).json({ message: `Insufficient stock for product ID ${pid}` });
      }
      const priceNum = Number(product.price);
      subtotal += priceNum * qty;
      orderItemsData.push({ productId: pid, quantity: qty, price: priceNum });
    }

    if (!orderItemsData.length) return res.status(400).json({ message: "No valid items" });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(401).json({ message: "User not found" });

    const address = buildAddressSnapshot(user, req.body || {});
    persistUserAddress(req.user.id, address);

    const shippingFee = calculateShipping(subtotal);
    const totalAmount = subtotal + shippingFee;
    const amountInPaise = Math.max(Math.floor(Number(totalAmount) * 100), 1000); // min 10 INR

    const rz = ensureRazorpay();
    const razorpayOrder = await rz.orders.create({
      amount: amountInPaise,
      currency,
      receipt: receipt || crypto.randomUUID(),
      notes: { source: "storefront" }
    });

    const orderRecord = await prisma.order.create({
      data: {
        userId: req.user.id,
        totalAmount,
        status: "PENDING",
        razorpayOrderId: razorpayOrder.id,
        paymentMethod: "razorpay",
        ...address,
        items: {
          create: orderItemsData
        }
      },
      include: { items: true }
    });

    res.json({ order: razorpayOrder, keyId: RAZORPAY_KEY_ID, localOrderId: orderRecord.id });
  } catch (err) {
    console.error("createRazorpayOrder error:", err);
    res.status(500).json({ message: "Failed to create order" });
  }
}

function verifyWebhookSignature(rawBody, signature) {
  if (!RAZORPAY_WEBHOOK_SECRET || !signature || !rawBody) return false;
  const digest = crypto.createHmac("sha256", RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  return digest === signature;
}

function shouldMarkPaid(event, paymentStatus) {
  const paidEvents = new Set(["payment.captured", "payment.authorized", "order.paid"]);
  return paidEvents.has(event) || paymentStatus === "captured";
}

function shouldMarkFailed(event, paymentStatus) {
  const failedEvents = new Set(["payment.failed", "order.payment_failed"]);
  return failedEvents.has(event) || paymentStatus === "failed";
}

export async function handleRazorpayWebhook(req, res) {
  const signature = req.headers["x-razorpay-signature"];
  const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body || {});

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("Razorpay webhook rejected due to invalid signature");
    return res.status(400).json({ message: "Invalid signature" });
  }

  const event = req.body?.event;
  const paymentEntity = req.body?.payload?.payment?.entity || {};
  const orderEntity = req.body?.payload?.order?.entity || {};
  const paymentId = paymentEntity.id;
  const razorpayOrderId = paymentEntity.order_id || orderEntity.id;
  const paymentStatus = paymentEntity.status;

  if (!paymentId && !razorpayOrderId) {
    return res.json({ received: true });
  }

  try {
    const searchConditions = [];
    if (razorpayOrderId) searchConditions.push({ razorpayOrderId });
    if (paymentId) searchConditions.push({ paymentId });

    const order = await prisma.order.findFirst({
      where: { OR: searchConditions },
      include: { items: true }
    });

    if (!order) {
      console.warn("Webhook received for unknown order/payment", {
        razorpayOrderId,
        paymentId,
        event
      });
      return res.json({ received: true });
    }

    const updates = {};
    if (paymentId && !order.paymentId) updates.paymentId = paymentId;
    if (razorpayOrderId && !order.razorpayOrderId) updates.razorpayOrderId = razorpayOrderId;

    const shouldSetPaid = order.status !== "PAID" && shouldMarkPaid(event, paymentStatus);
    const shouldSetCancelled =
      shouldMarkFailed(event, paymentStatus) && !["SHIPPED", "DELIVERED", "CANCELLED"].includes(order.status);

    if (shouldSetPaid) {
      updates.status = "PAID";
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } }
          });
        }
        await tx.order.update({
          where: { id: order.id },
          data: updates
        });
      });
    } else {
      if (shouldSetCancelled) {
        updates.status = "CANCELLED";
      }

      if (Object.keys(updates).length) {
        await prisma.order.update({
          where: { id: order.id },
          data: updates
        });
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("handleRazorpayWebhook error:", err);
    res.status(500).json({ message: "Failed to process webhook" });
  }
}
