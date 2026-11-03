import { Router, type Router as ExpressRouter } from "express";
import { prisma, type Prisma } from "@mgl/database";
import { requireAuth, requirePlatformPermission } from "../../middleware/auth";
import { Permission } from "@mgl/types";
import {
  workforceAccess,
  authenticated,
  WorkforceError,
} from "../../services/workforce/access";
import { object, text, integer } from "../../services/workforce/validation";
import { createQPayInvoice, checkQPayPayment } from "../../services/qpay";
import { verifiedQPayPaymentId } from "../../services/qpay-payment-verification";
import { quoteSeats } from "../../services/workforce/billing";
import { endpoint, audit, json } from "./http";
export const workforceBillingRouter: ExpressRouter = Router();
export const workforceBillingPublicRouter: ExpressRouter = Router();
interface CatalogEntry {
  code: string;
  name: string;
  description: string;
  price: number | null;
}
const catalogBase: CatalogEntry[] = [
  {
    code: "tracking",
    name: "Байршлын трекинг",
    description: "Ажлын үеийн байршлын мэдээлэл, илгээсэн байршлын түүх.",
    price: null,
  },
  {
    code: "mail",
    name: "Масс имэйл",
    description:
      "Сонгосон ажилтнууд руу имэйлээр мэдээлэл хүргэх нэмэлт үйлчилгээ.",
    price: null,
  },
];
async function catalog() {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: "workforce.addon-prices" },
  });
  let prices: Record<string, unknown> = {};
  try {
    prices = setting ? object(JSON.parse(setting.value) as unknown) : {};
  } catch {
    prices = {};
  }
  return catalogBase.map((item) => ({
    ...item,
    price:
      typeof prices[item.code] === "number" &&
      Number.isSafeInteger(prices[item.code]) &&
      Number(prices[item.code]) > 0
        ? Number(prices[item.code])
        : null,
  }));
}
workforceBillingRouter.get(
  "/billing",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req);
    const orders = ctx.canManage
      ? await prisma.workforceBillingOrder.findMany({
          where: { organizationId: ctx.organizationId },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : [];
    res.json({
      catalog: await catalog(),
      orders: orders.map((o) => ({
        id: o.id,
        kind: o.kind,
        addonCode: o.addonCode,
        seats: o.seats,
        amount: o.amount,
        state: o.state,
        createdAt: o.createdAt,
        paidAt: o.paidAt,
      })),
      paymentConfigured: Boolean(
        process.env.QPAY_CLIENT_ID &&
          process.env.QPAY_CLIENT_SECRET &&
          process.env.QPAY_INVOICE_CODE,
      ),
    });
  }),
);
workforceBillingRouter.post(
  "/billing",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, { manage: true }),
      b = object(req.body),
      kind = b.kind === "ADDON" ? "ADDON" : "SEATS",
      key = text(b.idempotencyKey, "Хүсэлтийн дугаар", 100);
    if (!/^[a-zA-Z0-9-]{16,100}$/.test(key))
      throw new WorkforceError(400, "Хүсэлтийн дугаар буруу");
    const existing = await prisma.workforceBillingOrder.findUnique({
      where: { idempotencyKey: key },
    });
    if (existing) {
      if (existing.organizationId !== ctx.organizationId)
        throw new WorkforceError(409, "Хүсэлтийн дугаар давхардсан");
      if (existing.invoiceData)
        return res.json({
          orderId: existing.id,
          amount: existing.amount,
          invoice: existing.invoiceData,
        });
      throw new WorkforceError(
        409,
        "Төлбөр үүсгэж байгаа эсвэл амжилтгүй болсон. Шинэ хүсэлтээр дахин оролдоно уу",
      );
    }
    if (
      !process.env.QPAY_CLIENT_ID ||
      !process.env.QPAY_CLIENT_SECRET ||
      !process.env.QPAY_INVOICE_CODE
    )
      throw new WorkforceError(
        503,
        "Төлбөрийн үйлчилгээ тохируулагдаагүй байна. Байгууллагын админтай холбогдоно уу",
      );
    const plan = ctx.member.organization.workforceSubscription;
    const seats =
      kind === "SEATS" ? integer(b.seats, "Ажилтны тоо", 1, 1000) : 0;
    const addonCode =
      kind === "ADDON" ? text(b.addonCode, "Нэмэлт үйлчилгээ", 30) : null;
    let amount: number;
    if (kind === "SEATS")
      amount = quoteSeats(
        seats,
        plan?.seatUnitPrice ?? null,
        plan?.expiresAt ?? null,
      );
    else {
      const addon = (await catalog()).find((a) => a.code === addonCode);
      if (!addon?.price)
        throw new WorkforceError(
          409,
          "Нэмэлт үйлчилгээний үнэ тохируулагдаагүй",
        );
      if (plan?.addons.includes(addon.code))
        throw new WorkforceError(409, "Үйлчилгээ аль хэдийн идэвхтэй");
      amount = addon.price;
    }
    const order = await prisma.workforceBillingOrder.create({
      data: {
        organizationId: ctx.organizationId,
        kind,
        seats,
        addonCode,
        amount,
        idempotencyKey: key,
        state: "CREATING",
      },
    });
    try {
      const invoice = await createQPayInvoice({
        orderId: order.id,
        orderNumber: `WF-${order.id.slice(0, 12)}`,
        amount,
        description:
          kind === "SEATS"
            ? `MGL Business · ${seats} ажилтны эрх`
            : `MGL Business · ${addonCode}`,
        callbackConfig: { path: "/api/workforce-billing/callback" },
      });
      if (!invoice.invoice_id) throw new Error("Invoice missing");
      await prisma.workforceBillingOrder.update({
        where: { id: order.id },
        data: {
          invoiceId: invoice.invoice_id,
          invoiceData: json(invoice),
          state: "PENDING",
        },
      });
      res.status(201).json({ orderId: order.id, amount, invoice });
    } catch (error) {
      await prisma.workforceBillingOrder.update({
        where: { id: order.id },
        data: { state: "FAILED" },
      });
      console.error(
        "[workforce billing create]",
        error instanceof Error ? error.message : "provider error",
      );
      throw new WorkforceError(502, "Төлбөрийн нэхэмжлэх үүсгэж чадсангүй");
    }
  }),
);
async function settleOrder(id: string, organizationId?: string) {
  const order = await prisma.workforceBillingOrder.findFirst({
    where: { id, ...(organizationId ? { organizationId } : {}) },
  });
  if (!order) throw new WorkforceError(404, "Төлбөр олдсонгүй");
  if (order.state === "PAID") return { paid: true };
  if (!order.invoiceId || order.state !== "PENDING")
    throw new WorkforceError(409, "Нэхэмжлэх идэвхгүй");
  const check = await checkQPayPayment(order.invoiceId),
    paymentId = verifiedQPayPaymentId(check, order.amount);
  if (!paymentId) return { paid: false };
  await prisma.$transaction(
    async (tx) => {
      const claimed = await tx.workforceBillingOrder.updateMany({
        where: { id, state: "PENDING" },
        data: {
          state: "PAID",
          paidAt: new Date(),
          providerPaymentId: paymentId,
        },
      });
      if (!claimed.count) return;
      if (order.kind === "SEATS")
        await tx.organization.update({
          where: { id: order.organizationId },
          data: { maxMembers: { increment: order.seats } },
        });
      else if (order.addonCode) {
        await tx.workforceSubscription.upsert({
          where: { organizationId: order.organizationId },
          create: {
            organizationId: order.organizationId,
            addons: [order.addonCode],
          },
          update: { addons: { push: order.addonCode } },
        });
      }
      await audit(
        tx,
        order.organizationId,
        "payment-provider",
        "BILLING_PAID",
        id,
        null,
        {
          kind: order.kind,
          seats: order.seats,
          addonCode: order.addonCode,
          amount: order.amount,
        },
      );
    },
    { isolationLevel: "Serializable" },
  );
  return { paid: true };
}
workforceBillingRouter.post(
  "/billing/:id/check",
  endpoint(async (req, res) => {
    const ctx = await workforceAccess(req, { manage: true });
    res.json(await settleOrder(String(req.params.id), ctx.organizationId));
  }),
);
workforceBillingPublicRouter.get(
  "/workforce-billing/callback",
  endpoint(async (req, res) => {
    const id = text(req.query.orderId, "Төлбөр", 100);
    await settleOrder(id);
    res.type("text/plain").send("SUCCESS");
  }),
);
workforceBillingPublicRouter.patch(
  "/admin/workforce-addon-prices",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_ORGANIZATIONS),
  endpoint(async (req, res) => {
    const b = object(req.body),
      prices = {
        tracking:
          b.tracking === null
            ? null
            : integer(b.tracking, "Трекинг үнэ", 1, 100000000),
        mail:
          b.mail === null ? null : integer(b.mail, "Имэйл үнэ", 1, 100000000),
      };
    await prisma.siteSetting.upsert({
      where: { key: "workforce.addon-prices" },
      create: { key: "workforce.addon-prices", value: JSON.stringify(prices) },
      update: { value: JSON.stringify(prices) },
    });
    res.json({ ok: true });
  }),
);

workforceBillingPublicRouter.get(
  "/admin/workforce-addon-prices",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_ORGANIZATIONS),
  endpoint(async (_req, res) => {
    res.json({ catalog: await catalog() });
  }),
);
