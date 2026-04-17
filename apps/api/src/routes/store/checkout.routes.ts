import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import jwt from "jsonwebtoken";
import {
  prisma,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
} from "@mgl/database";

const router: ExpressRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

/* ── Auth helper ──────────────────────────────────────── */
const getCustomer = async (req: Request) => {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string };
    if (!decoded?.userId) return null;
    return prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isActive: true, deletedAt: true },
    });
  } catch {
    return null;
  }
};

/* ── helpers ──────────────────────────────────────────── */
const generateOrderNumber = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  return `ORD-${y}${m}${d}-${rand}`;
};

/* ══════════════════════════════════════════════════════════
   POST /store/checkout
   Creates an Order + OrderItems + QPay mock invoice.
   Body: { lines: [{productId,qty}], phone?, shippingAddress? }
   ══════════════════════════════════════════════════════════ */
router.post("/store/checkout", async (req: Request, res: Response) => {
  try {
    const customer = await getCustomer(req);
    if (!customer || !customer.isActive || customer.deletedAt) {
      return res.status(401).json({ message: "Нэвтэрнэ үү" });
    }

    const { lines, phone, shippingAddress } = req.body as {
      lines?: { productId: string; qty: number }[];
      phone?: string;
      shippingAddress?: string;
    };

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ message: "Сагс хоосон байна" });
    }

    // Validate all products exist and are active
    const productIds = lines.map((l) => l.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, deletedAt: null, isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        stock: true,
        organizationId: true,
      },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({ message: "Зарим бараа олдсонгүй эсвэл идэвхгүй байна" });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate stock & build order items
    let subtotal = 0;
    const orderItemsData: {
      productId: string;
      quantity: number;
      price: number;
      subtotal: number;
      productName: string;
      productSku: string | null;
    }[] = [];

    for (const line of lines) {
      const product = productMap.get(line.productId);
      if (!product) {
        return res.status(400).json({ message: `Бараа олдсонгүй: ${line.productId}` });
      }
      const qty = Math.max(1, Math.floor(Number(line.qty) || 1));
      if (product.stock < qty) {
        return res
          .status(400)
          .json({ message: `${product.name} барааны нөөц хүрэлцэхгүй (${product.stock} ширхэг)` });
      }
      const price = Number(product.price);
      const lineTotal = price * qty;
      subtotal += lineTotal;

      orderItemsData.push({
        productId: product.id,
        quantity: qty,
        price,
        subtotal: lineTotal,
        productName: product.name,
        productSku: product.sku,
      });
    }

    // All products must belong to one organization
    const orgIds = [...new Set(products.map((p) => p.organizationId))];
    if (orgIds.length !== 1) {
      return res
        .status(400)
        .json({ message: "Нэг захиалгад зөвхөн нэг дэлгүүрийн бараа байх ёстой" });
    }

    const total = subtotal; // no delivery fee for now

    // Create order + items + payment attempt in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Decrement stock
      for (const item of orderItemsData) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      const ord = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          organizationId: orgIds[0],
          customerId: customer.id,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          paymentMethod: PaymentMethod.QPAY,
          shippingAddress: shippingAddress || "",
          phone: phone || "",
          subtotal,
          total,
          items: {
            create: orderItemsData,
          },
          history: {
            create: {
              toStatus: OrderStatus.PENDING,
              changedById: customer.id,
              note: "Захиалга үүсгэсэн",
            },
          },
          payments: {
            create: {
              method: PaymentMethod.QPAY,
              status: PaymentStatus.PENDING,
              amount: total,
            },
          },
        },
        include: {
          items: true,
          payments: { select: { id: true, status: true, amount: true } },
        },
      });

      return ord;
    });

    // Build mock QPay QR text
    const qrText = `qpay://pay?order=${order.id}&amount=${total}`;

    return res.status(201).json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: Number(order.total),
      subtotal: Number(order.subtotal),
      paymentId: order.payments[0]?.id,
      qrText,
      expiresIn: 120, // seconds
      items: order.items.map((i) => ({
        productId: i.productId,
        name: i.productName,
        qty: i.quantity,
        price: Number(i.price),
        subtotal: Number(i.subtotal),
      })),
    });
  } catch (error) {
    console.error("store checkout error", error);
    return res.status(500).json({ message: "Захиалга үүсгэхэд алдаа гарлаа" });
  }
});

/* ══════════════════════════════════════════════════════════
   POST /store/checkout/:orderId/confirm
   Mock payment confirmation (dev mode).
   ══════════════════════════════════════════════════════════ */
router.post("/store/checkout/:orderId/confirm", async (req: Request, res: Response) => {
  try {
    const customer = await getCustomer(req);
    if (!customer || !customer.isActive || customer.deletedAt) {
      return res.status(401).json({ message: "Нэвтэрнэ үү" });
    }

    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerId: true,
        status: true,
        paymentStatus: true,
        orderNumber: true,
        total: true,
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Захиалга олдсонгүй" });
    }

    if (order.customerId !== customer.id) {
      return res.status(403).json({ message: "Энэ захиалгад хандах эрхгүй" });
    }

    if (order.paymentStatus === "PAID") {
      return res.json({
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: "PAID",
        message: "Төлбөр аль хэдийн төлөгдсөн",
      });
    }

    // Mark payment as paid
    await prisma.$transaction(async (tx) => {
      await tx.paymentAttempt.updateMany({
        where: { orderId: order.id, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.PAID, paidAt: new Date() },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          status: OrderStatus.CONFIRMED,
        },
      });

      await tx.orderHistory.create({
        data: {
          orderId: order.id,
          fromStatus: OrderStatus.PENDING,
          toStatus: OrderStatus.CONFIRMED,
          changedById: customer.id,
          note: "QPay төлбөр амжилттай (mock)",
        },
      });
    });

    return res.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: "PAID",
      message: "Төлбөр амжилттай",
    });
  } catch (error) {
    console.error("store confirm error", error);
    return res.status(500).json({ message: "Төлбөр баталгаажуулахад алдаа гарлаа" });
  }
});

/* ══════════════════════════════════════════════════════════
   GET /store/orders
   Customer's order history.
   ══════════════════════════════════════════════════════════ */
router.get("/store/orders", async (req: Request, res: Response) => {
  try {
    const customer = await getCustomer(req);
    if (!customer || !customer.isActive || customer.deletedAt) {
      return res.status(401).json({ message: "Нэвтэрнэ үү" });
    }

    const orders = await prisma.order.findMany({
      where: { customerId: customer.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        items: {
          select: {
            productName: true,
            quantity: true,
            price: true,
            subtotal: true,
          },
        },
        organization: { select: { name: true } },
      },
    });

    return res.json({
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        total: Number(o.total),
        subtotal: Number(o.subtotal),
        deliveryCode: o.deliveryCode,
        organizationName: o.organization.name,
        createdAt: o.createdAt.toISOString(),
        items: o.items.map((i) => ({
          name: i.productName,
          qty: i.quantity,
          price: Number(i.price),
          subtotal: Number(i.subtotal),
        })),
      })),
    });
  } catch (error) {
    console.error("store orders error", error);
    return res.status(500).json({ message: "Захиалгын жагсаалт авахад алдаа гарлаа" });
  }
});

export { router as storeCheckoutRoutes };
