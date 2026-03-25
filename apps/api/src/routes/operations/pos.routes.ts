import { Router, type Router as ExpressRouter } from "express";
import {
  prisma,
  InventoryReason,
  PaymentMethod,
} from "@mgl/database";

const router: ExpressRouter = Router();

type CardAttemptStatus = "PENDING" | "APPROVED" | "DECLINED" | "FAILED";
type QPayInvoiceStatus = "PENDING" | "PAID" | "EXPIRED";

type CardAttemptRecord = {
  attemptId: string;
  amount: number;
  terminalId: string;
  bridgeUrl?: string;
  status: CardAttemptStatus;
  transactionId?: string;
  message?: string;
  createdAt: string;
  updatedAt: string;
};

type QPayInvoiceRecord = {
  invoiceId: string;
  amount: number;
  qrText: string;
  status: QPayInvoiceStatus;
  expiresAt: string;
  paidAt?: string;
  createdAt: string;
};

const cardAttempts = new Map<string, CardAttemptRecord>();
const qpayInvoices = new Map<string, QPayInvoiceRecord>();

type SaleLineInput = {
  productId: string;
  qty: number;
  unitPrice: number;
  discountAmount?: number;
  taxRate?: number;
};

type SalePaymentLineInput = {
  method: string;
  amount: number;
  transactionId?: string;
  invoiceId?: string;
};

type CreateSaleBody = {
  shiftId?: string;
  branchId?: string;
  paymentMethod?: string;
  paymentBreakdown?: SalePaymentLineInput[];
  lines?: SaleLineInput[];
  note?: string;
};

type ApiError = {
  status: number;
  message: string;
};

const toApiError = (status: number, message: string): ApiError => ({ status, message });

const normalizePaymentMethod = (value?: string): PaymentMethod | null => {
  if (!value) return null;
  const upper = String(value).toUpperCase();
  if (upper === "QR") return PaymentMethod.QPAY;
  if (upper === "QPAY") return PaymentMethod.QPAY;
  if (upper === "CASH") return PaymentMethod.CASH;
  if (upper === "CARD") return PaymentMethod.CARD;
  if (upper === "BANK_TRANSFER") return PaymentMethod.BANK_TRANSFER;
  return null;
};

router.post("/pos/payments/card/authorize", async (req, res) => {
  const amount = Number(req.body?.amount || 0);
  const terminalId = String(req.body?.terminalId || "terminal-1");
  const bridgeUrl: string | null = req.body?.bridgeUrl || null;

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: "CARD amount буруу байна" });
  }

  if (bridgeUrl !== null) {
    try {
      const parsed = new URL(bridgeUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return res.status(400).json({ message: "bridgeUrl зөвхөн http/https байх ёстой" });
      }
    } catch {
      return res.status(400).json({ message: "bridgeUrl формат буруу байна" });
    }
  }

  const attemptId = `card-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();
  const record: CardAttemptRecord = {
    attemptId,
    amount,
    terminalId,
    ...(bridgeUrl && { bridgeUrl }),
    status: "PENDING",
    createdAt: now,
    updatedAt: now,
  };

  cardAttempts.set(attemptId, record);

  if (bridgeUrl) {
    // Forward to local bridge running on the cashier machine.
    // The bridge translates this to the card terminal's native protocol (USB / LAN).
    void (async () => {
      try {
        const bridgeRes = await fetch(`${bridgeUrl}/charge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId, amount, terminalId }),
          signal: AbortSignal.timeout(30_000),
        });
        const bridgeData = (await bridgeRes.json()) as {
          status?: string;
          transactionId?: string;
          message?: string;
        };

        const latest = cardAttempts.get(attemptId);
        if (!latest || latest.status !== "PENDING") return;

        cardAttempts.set(attemptId, {
          ...latest,
          status:
            bridgeData.status === "APPROVED"
              ? "APPROVED"
              : bridgeData.status === "DECLINED"
                ? "DECLINED"
                : "FAILED",
          transactionId: bridgeData.transactionId,
          message: bridgeData.message,
          updatedAt: new Date().toISOString(),
        });
      } catch {
        const latest = cardAttempts.get(attemptId);
        if (!latest || latest.status !== "PENDING") return;
        cardAttempts.set(attemptId, {
          ...latest,
          status: "FAILED",
          message: "Bridge холболт амжилтгүй боллоо",
          updatedAt: new Date().toISOString(),
        });
      }
    })();
  } else {
    // Integration-ready simulation: replace with bank terminal SDK/bridge callback.
    setTimeout(() => {
      const latest = cardAttempts.get(attemptId);
      if (!latest || latest.status !== "PENDING") return;

      cardAttempts.set(attemptId, {
        ...latest,
        status: "APPROVED",
        transactionId: `card-txn-${Date.now()}`,
        message: "Card төлбөр баталгаажлаа",
        updatedAt: new Date().toISOString(),
      });
    }, 1800);
  }

  return res.status(201).json(record);
});

router.get("/pos/payments/card/status/:attemptId", async (req, res) => {
  const attemptId = String(req.params.attemptId || "");
  const record = cardAttempts.get(attemptId);

  if (!record) {
    return res.status(404).json({ message: "Card attempt олдсонгүй" });
  }

  return res.json(record);
});

router.post("/pos/payments/qpay/invoice", async (req, res) => {
  const amount = Number(req.body?.amount || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: "QPay amount буруу байна" });
  }

  const invoiceId = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const record: QPayInvoiceRecord = {
    invoiceId,
    amount,
    qrText: `qpay://pay?invoice=${invoiceId}&amount=${amount}`,
    status: "PENDING",
    expiresAt,
    createdAt: new Date().toISOString(),
  };

  qpayInvoices.set(invoiceId, record);
  return res.status(201).json(record);
});

router.get("/pos/payments/qpay/status/:invoiceId", async (req, res) => {
  const invoiceId = String(req.params.invoiceId || "");
  const record = qpayInvoices.get(invoiceId);

  if (!record) {
    return res.status(404).json({ message: "QPay invoice олдсонгүй" });
  }

  if (record.status === "PENDING" && new Date(record.expiresAt).getTime() <= Date.now()) {
    const expired: QPayInvoiceRecord = {
      ...record,
      status: "EXPIRED",
    };
    qpayInvoices.set(invoiceId, expired);
    return res.json(expired);
  }

  return res.json(record);
});

router.post("/pos/payments/qpay/confirm", async (req, res) => {
  const invoiceId = String(req.body?.invoiceId || "");
  const record = qpayInvoices.get(invoiceId);

  if (!record) {
    return res.status(404).json({ message: "QPay invoice олдсонгүй" });
  }

  const updated: QPayInvoiceRecord = {
    ...record,
    status: "PAID",
    paidAt: new Date().toISOString(),
  };

  qpayInvoices.set(invoiceId, updated);
  return res.json(updated);
});

router.post("/pos/sales", async (req, res) => {
  try {
    const body = req.body as CreateSaleBody;
    const lines = Array.isArray(body.lines) ? body.lines : [];

    if (!body.shiftId || !body.branchId) {
      return res.status(400).json({ message: "shiftId болон branchId шаардлагатай" });
    }

    if (lines.length === 0) {
      return res.status(400).json({ message: "Зарах барааны мөрүүд хоосон байна" });
    }

    const qtyByProduct = new Map<string, number>();
    for (const line of lines) {
      if (!line.productId || !Number.isFinite(line.qty) || line.qty <= 0) {
        return res.status(400).json({ message: "Мөрийн өгөгдөл буруу байна" });
      }
      qtyByProduct.set(line.productId, (qtyByProduct.get(line.productId) || 0) + line.qty);
    }

    const productIds = Array.from(qtyByProduct.keys());
    const receiptNo = `POS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-6)}`;

    const result = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
          deletedAt: null,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          stock: true,
          organizationId: true,
        },
      });

      if (products.length !== productIds.length) {
        throw toApiError(404, "Зарим бараа олдсонгүй");
      }

      for (const product of products) {
        const requestedQty = qtyByProduct.get(product.id) || 0;
        if (product.stock < requestedQty) {
          throw toApiError(
            409,
            `"${product.name}" барааны нөөц хүрэлцэхгүй (үлдэгдэл: ${product.stock})`,
          );
        }
      }

      for (const [productId, qty] of qtyByProduct) {
        await tx.product.update({
          where: { id: productId },
          data: { stock: { decrement: qty } },
        });

        await tx.inventoryLedger.create({
          data: {
            productId,
            change: -qty,
            reason: InventoryReason.ORDER,
            note: body.note || "POS sale",
            referenceId: receiptNo,
            referenceType: "POS_SALE",
          },
        });
      }

      return { products };
    });

    const lineDetails = lines.map((line) => {
      const product = result.products.find((item) => item.id === line.productId);
      const discount = Number(line.discountAmount || 0);
      const unitPrice = Number(line.unitPrice || 0);
      const qty = Number(line.qty || 0);
      const taxRate = Number(line.taxRate || 0);
      const subTotal = unitPrice * qty;
      const discountTotal = discount * qty;
      const taxable = Math.max(0, subTotal - discountTotal);
      const taxAmount = taxable * (taxRate / 100);
      const lineTotal = taxable + taxAmount;

      return {
        productId: line.productId,
        name: product?.name || line.productId,
        qty,
        unitPrice,
        taxAmount,
        lineTotal,
      };
    });

    const subTotal = lineDetails.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
    const taxTotal = lineDetails.reduce((sum, line) => sum + line.taxAmount, 0);
    const discountTotal = lines.reduce(
      (sum, line) => sum + Number(line.discountAmount || 0) * Number(line.qty || 0),
      0,
    );
    const grandTotal = subTotal + taxTotal - discountTotal;

    const paymentBreakdown = Array.isArray(body.paymentBreakdown)
      ? body.paymentBreakdown.map((item) => ({
          method: normalizePaymentMethod(item.method) || item.method,
          amount: Number(item.amount || 0),
          transactionId: item.transactionId,
          invoiceId: item.invoiceId,
        }))
      : [];

    res.status(201).json({
      id: `pos-${Date.now()}`,
      receiptNo,
      branchName: body.branchId,
      cashierName: "Vendor Cashier",
      paymentMethod: body.paymentMethod || "CASH",
      paymentBreakdown,
      createdAt: new Date().toISOString(),
      lines: lineDetails,
      subTotal,
      taxTotal,
      discountTotal,
      grandTotal,
    });
  } catch (error) {
    console.error("create pos sale error", error);

    const maybeApiError = error as Partial<ApiError>;
    if (maybeApiError?.status && maybeApiError?.message) {
      return res.status(maybeApiError.status).json({ message: maybeApiError.message });
    }

    res.status(500).json({ message: "POS борлуулалт үүсгэхэд алдаа гарлаа" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * PosRegister config — vendor POS machine fetches this on boot
 * GET /pos/register-config?registerId=<uuid>
 * ─────────────────────────────────────────────────────────────────────── */
router.get("/pos/register-config", async (req, res) => {
  const registerId = String(req.query.registerId || "").trim();
  if (!registerId) {
    return res.status(400).json({ message: "registerId шаардлагатай" });
  }

  try {
    const register = await prisma.posRegister.findUnique({
      where: { id: registerId },
      select: {
        id: true,
        name: true,
        label: true,
        cardEnabled: true,
        cardProviderType: true,
        cardTerminalId: true,
        terminalBridgeUrl: true,
        qpayEnabled: true,
        qpayMerchantId: true,
        qpayTerminalId: true,
        isActive: true,
        branchId: true,
        organizationId: true,
        branch: { select: { id: true, name: true } },
      },
    });

    if (!register) {
      return res.status(404).json({ message: "POS олдсонгүй" });
    }
    if (!register.isActive) {
      return res.status(403).json({ message: "POS идэвхгүй байна" });
    }

    return res.json(register);
  } catch (error) {
    console.error("get pos register-config error", error);
    return res.status(500).json({ message: "POS config авахад алдаа гарлаа" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * Admin — PosRegister CRUD
 * ─────────────────────────────────────────────────────────────────────── */

// GET /admin/pos-registers?organizationId=<uuid>
router.get("/admin/pos-registers", async (req, res) => {
  const organizationId = String(req.query.organizationId || "").trim();
  if (!organizationId) {
    return res.status(400).json({ message: "organizationId шаардлагатай" });
  }

  try {
    const registers = await prisma.posRegister.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      include: { branch: { select: { id: true, name: true } } },
    });
    return res.json(registers);
  } catch (error) {
    console.error("list pos-registers error", error);
    return res.status(500).json({ message: "POS жагсаалт авахад алдаа гарлаа" });
  }
});

// POST /admin/pos-registers
router.post("/admin/pos-registers", async (req, res) => {
  const {
    organizationId,
    branchId,
    name,
    label,
    cardEnabled,
    cardProviderType,
    cardTerminalId,
    terminalBridgeUrl,
    qpayEnabled,
    qpayMerchantId,
    qpayTerminalId,
  } = req.body as {
    organizationId?: string;
    branchId?: string;
    name?: string;
    label?: string;
    cardEnabled?: boolean;
    cardProviderType?: string;
    cardTerminalId?: string;
    terminalBridgeUrl?: string;
    qpayEnabled?: boolean;
    qpayMerchantId?: string;
    qpayTerminalId?: string;
  };

  if (!organizationId || !branchId || !name) {
    return res.status(400).json({ message: "organizationId, branchId, name шаардлагатай" });
  }

  // Validate terminalBridgeUrl if provided
  if (terminalBridgeUrl) {
    try {
      const parsed = new URL(terminalBridgeUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return res.status(400).json({ message: "terminalBridgeUrl зөвхөн http/https байх ёстой" });
      }
    } catch {
      return res.status(400).json({ message: "terminalBridgeUrl формат буруу байна" });
    }
  }

  try {
    const register = await prisma.posRegister.create({
      data: {
        organizationId,
        branchId,
        name: String(name).trim(),
        label: label ? String(label).trim() : null,
        cardEnabled: Boolean(cardEnabled),
        cardProviderType: cardProviderType || null,
        cardTerminalId: cardTerminalId || null,
        terminalBridgeUrl: terminalBridgeUrl || null,
        qpayEnabled: Boolean(qpayEnabled),
        qpayMerchantId: qpayMerchantId || null,
        qpayTerminalId: qpayTerminalId || null,
      },
      include: { branch: { select: { id: true, name: true } } },
    });
    return res.status(201).json(register);
  } catch (error) {
    console.error("create pos-register error", error);
    return res.status(500).json({ message: "POS үүсгэхэд алдаа гарлаа" });
  }
});

// PATCH /admin/pos-registers/:id
router.patch("/admin/pos-registers/:id", async (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ message: "id шаардлагатай" });

  const {
    name,
    label,
    cardEnabled,
    cardProviderType,
    cardTerminalId,
    terminalBridgeUrl,
    qpayEnabled,
    qpayMerchantId,
    qpayTerminalId,
    isActive,
  } = req.body as {
    name?: string;
    label?: string;
    cardEnabled?: boolean;
    cardProviderType?: string;
    cardTerminalId?: string;
    terminalBridgeUrl?: string;
    qpayEnabled?: boolean;
    qpayMerchantId?: string;
    qpayTerminalId?: string;
    isActive?: boolean;
  };

  if (terminalBridgeUrl !== undefined && terminalBridgeUrl !== null && terminalBridgeUrl !== "") {
    try {
      const parsed = new URL(terminalBridgeUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return res.status(400).json({ message: "terminalBridgeUrl зөвхөн http/https байх ёстой" });
      }
    } catch {
      return res.status(400).json({ message: "terminalBridgeUrl формат буруу байна" });
    }
  }

  try {
    const existing = await prisma.posRegister.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "POS олдсонгүй" });

    const updated = await prisma.posRegister.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(label !== undefined && { label: label ? String(label).trim() : null }),
        ...(cardEnabled !== undefined && { cardEnabled: Boolean(cardEnabled) }),
        ...(cardProviderType !== undefined && { cardProviderType: cardProviderType || null }),
        ...(cardTerminalId !== undefined && { cardTerminalId: cardTerminalId || null }),
        ...(terminalBridgeUrl !== undefined && { terminalBridgeUrl: terminalBridgeUrl || null }),
        ...(qpayEnabled !== undefined && { qpayEnabled: Boolean(qpayEnabled) }),
        ...(qpayMerchantId !== undefined && { qpayMerchantId: qpayMerchantId || null }),
        ...(qpayTerminalId !== undefined && { qpayTerminalId: qpayTerminalId || null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
      include: { branch: { select: { id: true, name: true } } },
    });
    return res.json(updated);
  } catch (error) {
    console.error("update pos-register error", error);
    return res.status(500).json({ message: "POS засахад алдаа гарлаа" });
  }
});

// DELETE /admin/pos-registers/:id
router.delete("/admin/pos-registers/:id", async (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ message: "id шаардлагатай" });

  try {
    const existing = await prisma.posRegister.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "POS олдсонгүй" });

    await prisma.posRegister.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (error) {
    console.error("delete pos-register error", error);
    return res.status(500).json({ message: "POS Бүртгэл устгахад алдаа гарлаа" });
  }
});

export default router;
