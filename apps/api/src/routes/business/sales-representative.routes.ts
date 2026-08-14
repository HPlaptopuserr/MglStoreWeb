import { Router, type Router as ExpressRouter } from "express";
import crypto from "crypto";
import {
  Capability,
  AuditAction,
  OnboardingSource,
  OrgStatus,
  OrgType,
  PaymentStatus,
  PaymentMethod,
  PlatformRole,
  Prisma,
  StockRequestStatus,
  WarehouseType,
  prisma,
} from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import {
  checkSystemQrPayment,
  createSystemQrInvoice,
} from "../../services/systemqr";
import {
  getStockMinuPaymentAccount,
  stockMinuPaymentNote,
  StockMinuConfigurationError,
} from "../../services/stock-minu-payment.service";
import { canPayApprovedStockRequest } from "../../services/stock-payment.policy";
import {
  getOutstandingStockPayments,
  serializeOutstandingPayment,
} from "../../services/outstanding-stock-payment.service";
import { getSalesStoreLocationSources } from "../../services/sales-store-portfolio.service";
import { notifyNewSalesRepresentativeStockRequest } from "../../services/stock-request-notification.service";
import {
  confirmRepresentativeCashPayment,
  validatePartialPaymentAmount,
} from "../../services/sales-representative-cash-payment.service";

const router: ExpressRouter = Router();
const MANAGER_ROLES = new Set(["OWNER", "ADMIN", "CEO", "MANAGER"]);

export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const earthRadius = 6_371_000;
  const radians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = radians(lat2 - lat1);
  const deltaLng = radians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radians(lat1)) *
      Math.cos(radians(lat2)) *
      Math.sin(deltaLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function optionalDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function locationFields(body: Record<string, unknown>) {
  return {
    ...(typeof body.name === "string" && { name: body.name.trim() }),
    ...(typeof body.address === "string" && { address: body.address.trim() }),
    ...(typeof body.latitude === "number" && { latitude: body.latitude }),
    ...(typeof body.longitude === "number" && { longitude: body.longitude }),
    ...(typeof body.radiusMeters === "number" && {
      radiusMeters: Math.min(
        1_000,
        Math.max(50, Math.round(body.radiusMeters)),
      ),
    }),
    ...(body.contactName !== undefined && {
      contactName:
        typeof body.contactName === "string"
          ? body.contactName.trim() || null
          : null,
    }),
    ...(body.contactPhone !== undefined && {
      contactPhone:
        typeof body.contactPhone === "string"
          ? body.contactPhone.trim() || null
          : null,
    }),
  };
}

async function validRepresentativeIds(organizationId: string, value: unknown) {
  const ids = Array.isArray(value)
    ? value.filter((id): id is string => typeof id === "string")
    : [];
  if (ids.length === 0) return [];
  const members = await prisma.organizationMember.findMany({
    where: {
      id: { in: ids },
      organizationId,
      isActive: true,
      capabilities: { has: Capability.SALES_REPRESENTATIVE },
    },
    select: { id: true },
  });
  return members.map(({ id }) => id);
}

async function membership(user: AuthPayload) {
  if (!user.organizationId) return null;
  return prisma.organizationMember.findFirst({
    where: {
      userId: user.userId,
      organizationId: user.organizationId,
      isActive: true,
      deletedAt: null,
    },
    select: { id: true, organizationId: true, role: true, capabilities: true },
  });
}

function coordinates(
  body: unknown,
): { latitude: number; longitude: number } | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  return typeof value.latitude === "number" &&
    Number.isFinite(value.latitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    typeof value.longitude === "number" &&
    Number.isFinite(value.longitude) &&
    value.longitude >= -180 &&
    value.longitude <= 180
    ? { latitude: value.latitude, longitude: value.longitude }
    : null;
}

export function salesVendorDetails(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const taxId = typeof body.taxId === "string" ? body.taxId.trim() : "";
  const ownerName =
    typeof body.ownerName === "string" ? body.ownerName.trim() : "";
  const ownerEmail =
    typeof body.ownerEmail === "string"
      ? body.ownerEmail.trim().toLowerCase()
      : null;
  const ownerPhone =
    typeof body.ownerPhone === "string" ? body.ownerPhone.trim() : "";
  const address = typeof body.address === "string" ? body.address.trim() : "";
  const point = coordinates(body);
  const storeType =
    body.storeType === "GROCERY" || body.storeType === "OTHER"
      ? body.storeType
      : null;
  if (
    !name ||
    !taxId ||
    !ownerName ||
    (ownerEmail !== null && !ownerEmail.includes("@")) ||
    !ownerPhone ||
    !address ||
    !point ||
    !storeType
  )
    return null;
  return {
    name,
    taxId,
    ownerName,
    ownerEmail,
    ownerPhone,
    address,
    point,
    storeType,
  };
}

function requireRepresentative(
  current: Awaited<ReturnType<typeof membership>>,
) {
  return Boolean(
    current?.capabilities.includes(Capability.SALES_REPRESENTATIVE),
  );
}

export function canRegisterSalesVendor(
  role: string | null | undefined,
  capabilities: readonly Capability[] = [],
) {
  return Boolean(
    (role && MANAGER_ROLES.has(role)) ||
    capabilities.includes(Capability.SALES_REPRESENTATIVE),
  );
}

function normalizedSlug(name: string) {
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "vendor";
  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
}

export function exactPhoneCandidates(value: string) {
  const raw = value.trim();
  const digits = raw.replace(/\D/g, "");
  const candidates = new Set([raw, digits, digits ? `+${digits}` : ""]);
  if (digits.length === 8) {
    candidates.add(`976${digits}`);
    candidates.add(`+976${digits}`);
  }
  return [...candidates].filter(Boolean);
}

export type SalesStoreRegion = "ULAANBAATAR" | "LOCAL";

export function salesStoreRegion(
  latitude: number,
  longitude: number,
  address: string,
): SalesStoreRegion {
  const normalizedAddress = address.trim().toLocaleLowerCase("mn-MN");
  if (
    normalizedAddress.includes("улаанбаатар") ||
    normalizedAddress.includes("нийслэл")
  ) {
    return "ULAANBAATAR";
  }
  if (
    normalizedAddress.includes(" аймаг") ||
    normalizedAddress.endsWith("аймаг") ||
    normalizedAddress.includes(" сум") ||
    normalizedAddress.endsWith("сум")
  ) {
    return "LOCAL";
  }

  // Ulaanbaatar's populated metro area. Explicit address text above takes
  // precedence so stores near the city boundary remain correctly classified.
  const isInsideUlaanbaatarMetro =
    latitude >= 47.55 &&
    latitude <= 48.15 &&
    longitude >= 106.55 &&
    longitude <= 107.35;
  return isInsideUlaanbaatarMetro ? "ULAANBAATAR" : "LOCAL";
}

export function canRepresentativeAccessVendor(
  restrictionEnabled: boolean,
  isAssigned: boolean,
) {
  return !restrictionEnabled || isAssigned;
}

async function representativeVendorAccess(
  current: NonNullable<Awaited<ReturnType<typeof membership>>>,
  vendorId: string,
) {
  const [ownerOrganization, vendor, location] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: current.organizationId },
      select: { salesRepVendorRestrictionEnabled: true },
    }),
    prisma.organization.findFirst({
      where: {
        id: vendorId,
        status: OrgStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        taxId: true,
        email: true,
        phone: true,
        address: true,
        businessCategory: true,
      },
    }),
    prisma.salesVisitLocation.findFirst({
      where: {
        organizationId: current.organizationId,
        vendorOrganizationId: vendorId,
        isActive: true,
        assignments: { some: { memberId: current.id } },
      },
    }),
  ]);
  if (!vendor) return null;
  if (
    !canRepresentativeAccessVendor(
      ownerOrganization?.salesRepVendorRestrictionEnabled ?? false,
      location !== null,
    )
  )
    return null;
  return { vendor, location };
}

router.post(
  "/sales-representative/vendor-lookup",
  requireAuth,
  async (req, res) => {
    const actor = (req as any).user as AuthPayload;
    const current = await membership(actor);
    if (!current || !canRegisterSalesVendor(current.role, current.capabilities))
      return res
        .status(403)
        .json({ message: "Дэлгүүр бүртгэх эрх шаардлагатай" });
    const body = req.body as Record<string, unknown>;
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const taxId = typeof body.taxId === "string" ? body.taxId.trim() : "";
    const lookupCount = [email, phone, taxId].filter(Boolean).length;
    if (lookupCount !== 1)
      return res.status(400).json({
        message: "Утас, имэйл эсвэл регистрийн аль нэгийг оруулна уу",
      });
    const vendor = await prisma.organization.findFirst({
      where: {
        status: OrgStatus.ACTIVE,
        deletedAt: null,
        ...(email
          ? { email: { equals: email, mode: "insensitive" } }
          : phone
            ? { phone: { in: exactPhoneCandidates(phone) } }
            : { taxId }),
      },
      select: {
        id: true,
        name: true,
        taxId: true,
        email: true,
        phone: true,
        address: true,
        businessCategory: true,
      },
    });
    if (!vendor)
      return res
        .status(404)
        .json({ message: "Бүртгэлтэй байгууллага олдсонгүй" });
    const location = await prisma.salesVisitLocation.findUnique({
      where: { vendorOrganizationId: vendor.id },
      select: {
        organizationId: true,
        assignments: {
          where: { memberId: current.id },
          select: { memberId: true },
        },
      },
    });
    const available =
      location === null || location.organizationId === current.organizationId;
    void prisma.auditLog.create({
      data: {
        userId: actor.userId,
        action: AuditAction.SALES_REP_VENDOR_LOOKUP,
        ip: req.ip,
        userAgent: req.get("user-agent") || null,
        meta: {
          vendorId: vendor.id,
          representativeOrganizationId: current.organizationId,
          lookupType: email ? "EMAIL" : phone ? "PHONE" : "TAX_ID",
        },
      },
    });
    return res.json({
      vendor,
      assigned: (location?.assignments.length ?? 0) > 0,
      available,
    });
  },
);

router.get("/sales-representative/vendors", requireAuth, async (req, res) => {
  const current = await membership((req as any).user as AuthPayload);
  if (!current || !canRegisterSalesVendor(current.role, current.capabilities))
    return res
      .status(403)
      .json({ message: "Дэлгүүрийн мэдээлэл харах эрх шаардлагатай" });
  const manager = MANAGER_ROLES.has(current!.role);
  const rows = await prisma.salesVisitLocation.findMany({
    where: {
      organizationId: current!.organizationId,
      isActive: true,
      vendorOrganizationId: { not: null },
      ...(!manager && { assignments: { some: { memberId: current!.id } } }),
    },
    include: {
      vendorOrganization: {
        select: {
          id: true,
          name: true,
          taxId: true,
          email: true,
          phone: true,
          address: true,
          businessCategory: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return res.json(rows);
});

router.get(
  "/sales-representative/store-locations",
  requireAuth,
  async (req, res) => {
    const current = await membership((req as any).user as AuthPayload);
    if (
      !current ||
      (!MANAGER_ROLES.has(current.role) && !requireRepresentative(current))
    )
      return res
        .status(403)
        .json({ message: "Дэлгүүрийн байршил харах эрх шаардлагатай" });

    const locations = await getSalesStoreLocationSources(current.id);
    const stores = locations.map((location) => ({
      ...location,
      region: salesStoreRegion(
        location.latitude,
        location.longitude,
        location.address,
      ),
    }));
    const ulaanbaatar = stores.filter(
      ({ region }) => region === "ULAANBAATAR",
    ).length;

    return res.json({
      summary: {
        total: stores.length,
        ulaanbaatar,
        local: stores.length - ulaanbaatar,
      },
      stores,
    });
  },
);

router.get(
  "/sales-representative/vendors/:vendorId/outstanding-payments",
  requireAuth,
  async (req, res) => {
    const current = await membership((req as any).user as AuthPayload);
    if (!current || !requireRepresentative(current))
      return res
        .status(403)
        .json({ message: "Худалдааны төлөөлөгчийн эрх шаардлагатай" });
    if (!(await representativeVendorAccess(current, req.params.vendorId)))
      return res.status(404).json({ message: "Таны vendor олдсонгүй" });
    const payments = await getOutstandingStockPayments(req.params.vendorId);
    return res.json({
      count: payments.length,
      totalUnpaid: payments.reduce(
        (total, payment) => total + payment.outstandingAmount,
        0,
      ),
      payments: payments.map(serializeOutstandingPayment),
    });
  },
);

async function representativePayment(
  current: NonNullable<Awaited<ReturnType<typeof membership>>>,
  vendorId: string,
  paymentId: string,
) {
  if (!(await representativeVendorAccess(current, vendorId))) return null;
  return prisma.stockRequestPayment.findFirst({
    where: { id: paymentId, organizationId: vendorId },
    include: { request: { select: { requestNumber: true, status: true } } },
  });
}

async function confirmRepresentativeQPayEntry(
  paymentId: string,
  transactionId: string,
) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.stockRequestPaymentEntry.findUnique({
      where: { transactionId },
    });
    if (!entry || entry.paymentId !== paymentId)
      throw new Error("QPAY_ENTRY_NOT_FOUND");
    const payment = await tx.stockRequestPayment.findUniqueOrThrow({
      where: { id: paymentId },
    });
    if (entry.status === PaymentStatus.PAID) {
      return {
        status: PaymentStatus.PAID,
        paymentStatus: payment.status,
        paidAmount: Number(payment.paidAmount),
        outstandingAmount: Math.max(
          0,
          Number(payment.totalAmount) - Number(payment.paidAmount),
        ),
      };
    }
    const validation = validatePartialPaymentAmount(payment, entry.amount);
    if (!validation.ok) throw new Error(`PAYMENT_VALIDATION:${validation.message}`);
    const paidAmount = Number(payment.paidAmount) + validation.amount;
    const confirmedAt = new Date();
    await tx.stockRequestPayment.update({
      where: { id: paymentId },
      data: {
        status: validation.fullyPaid ? PaymentStatus.PAID : PaymentStatus.PENDING,
        paidAmount,
        paidAt: validation.fullyPaid ? confirmedAt : null,
        paymentMethod: PaymentMethod.QPAY,
        confirmedById: null,
        confirmedAt,
        note: "Дэлгүүрийн QPay төлбөр — автоматаар баталгаажсан",
      },
    });
    await tx.stockRequestPaymentEntry.update({
      where: { id: entry.id },
      data: { status: PaymentStatus.PAID, confirmedAt },
    });
    return {
      status: PaymentStatus.PAID,
      paymentStatus: validation.fullyPaid
        ? PaymentStatus.PAID
        : PaymentStatus.PENDING,
      paidAmount,
      outstandingAmount: validation.outstandingBefore - validation.amount,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

router.post(
  "/sales-representative/vendors/:vendorId/payments/:paymentId/qpay",
  requireAuth,
  async (req, res) => {
    const actor = (req as any).user as AuthPayload;
    const current = await membership(actor);
    if (!current || !requireRepresentative(current))
      return res
        .status(403)
        .json({ message: "Худалдааны төлөөлөгчийн эрх шаардлагатай" });
    const payment = await representativePayment(
      current,
      req.params.vendorId,
      req.params.paymentId,
    );
    if (!payment) return res.status(404).json({ message: "Төлбөр олдсонгүй" });
    if (!canPayApprovedStockRequest(payment.request.status))
      return res.status(409).json({
        code: "STOCK_REQUEST_NOT_APPROVED",
        message: "Админ зөвшөөрсний дараа QPay нэхэмжлэх нээгдэнэ",
      });
    if (payment.status === PaymentStatus.PAID)
      return res.status(409).json({ message: "Төлбөр аль хэдийн төлөгдсөн" });
    if (payment.status === PaymentStatus.CANCELLED)
      return res.status(409).json({ message: "Төлбөр цуцлагдсан байна" });
    const validation = validatePartialPaymentAmount(payment, req.body?.amount);
    if (!validation.ok)
      return res.status(validation.status).json({ message: validation.message });
    const amount = validation.amount;

    if (process.env.MGL_LOCAL_DEV === "true") {
      const transactionId = `DEV-QPAY-${payment.id}-${Date.now()}`;
      await prisma.stockRequestPayment.update({
        where: { id: payment.id },
        data: { transactionId, paymentMethod: PaymentMethod.QPAY },
      });
      await prisma.stockRequestPaymentEntry.create({
        data: {
          paymentId: payment.id,
          amount,
          method: PaymentMethod.QPAY,
          status: PaymentStatus.PENDING,
          transactionId,
          note: "Local QPay хэсэгчилсэн төлбөр",
        },
      });
      void prisma.auditLog.create({
        data: {
          userId: actor.userId,
          action: AuditAction.SALES_REP_VENDOR_PAYMENT_OPENED,
          ip: req.ip,
          userAgent: req.get("user-agent") || null,
          meta: {
            vendorId: req.params.vendorId,
            paymentId: payment.id,
            amount,
            mode: "DEV",
          },
        },
      });
      return res.json({
        paymentId: payment.id,
        invoiceNumber: payment.invoiceNumber,
        amount,
        qrText: `mgl-business://dev-qpay/${payment.id}?amount=${amount}`,
        qrImage: "",
        qpayInvoiceId: transactionId,
        deepLinks: [],
        expiresIn: 3600,
        devMode: true,
      });
    }

    try {
      const minuAccount = await getStockMinuPaymentAccount();
      const qpayData = await createSystemQrInvoice(
        {
          merchantCode: minuAccount.merchantCode,
          amount,
          referenceNumber: payment.id,
        },
        minuAccount.username,
        minuAccount.password,
      );
      await prisma.stockRequestPayment.update({
        where: { id: payment.id },
        data: {
          transactionId: qpayData.invoiceId,
          paymentMethod: PaymentMethod.QPAY,
        },
      });
      await prisma.stockRequestPaymentEntry.create({
        data: {
          paymentId: payment.id,
          amount,
          method: PaymentMethod.QPAY,
          status: PaymentStatus.PENDING,
          transactionId: qpayData.invoiceId,
          note: stockMinuPaymentNote(minuAccount.merchantCode),
        },
      });
      void prisma.auditLog.create({
        data: {
          userId: actor.userId,
          action: AuditAction.SALES_REP_VENDOR_PAYMENT_OPENED,
          ip: req.ip,
          userAgent: req.get("user-agent") || null,
          meta: {
            vendorId: req.params.vendorId,
            paymentId: payment.id,
            amount,
            mode: "QPAY",
          },
        },
      });
      return res.json({
        paymentId: payment.id,
        invoiceNumber: payment.invoiceNumber,
        amount,
        qrText: qpayData.qrText,
        qrImage: "",
        qpayInvoiceId: qpayData.invoiceId,
        deepLinks: qpayData.urls,
        expiresIn: 300,
      });
    } catch (error) {
      console.error("sales representative qpay invoice error", error);
      if (error instanceof StockMinuConfigurationError)
        return res.status(409).json({ message: error.message });
      return res
        .status(502)
        .json({ message: "QPay нэхэмжлэх үүсгэхэд алдаа гарлаа" });
    }
  },
);

router.post(
  "/sales-representative/vendors/:vendorId/payments/:paymentId/cash/confirm",
  requireAuth,
  async (req, res) => {
    const actor = (req as any).user as AuthPayload;
    const current = await membership(actor);
    if (!current || !requireRepresentative(current))
      return res
        .status(403)
        .json({ message: "Худалдааны төлөөлөгчийн эрх шаардлагатай" });

    const payment = await representativePayment(
      current,
      req.params.vendorId,
      req.params.paymentId,
    );
    if (!payment) return res.status(404).json({ message: "Төлбөр олдсонгүй" });
    if (!canPayApprovedStockRequest(payment.request.status))
      return res.status(409).json({
        code: "STOCK_REQUEST_NOT_APPROVED",
        message: "Админ зөвшөөрсний дараа бэлэн төлбөр баталгаажна",
      });
    if (req.body?.confirmation !== "CASH_RECEIVED")
      return res.status(400).json({
        message: "Бэлэн мөнгө хүлээн авснаа баталгаажуулна уу",
      });

    const idempotencyKey =
      typeof req.body?.idempotencyKey === "string"
        ? req.body.idempotencyKey.trim()
        : "";
    if (!/^[a-zA-Z0-9-]{16,80}$/.test(idempotencyKey))
      return res.status(400).json({ message: "Төлбөрийн хүсэлтийн ID буруу байна" });

    const validation = validatePartialPaymentAmount(payment, req.body?.amount);
    if (!validation.ok)
      return res
        .status(validation.status)
        .json({ message: validation.message });

    let result;
    try {
      result = await confirmRepresentativeCashPayment({
        paymentId: payment.id,
        amount: validation.amount,
        actorUserId: actor.userId,
        idempotencyKey,
        note: typeof req.body?.note === "string" ? req.body.note : undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "PAYMENT_BALANCE_CHANGED")
        return res.status(409).json({ message: "Үлдэгдэл өөрчлөгдсөн тул дахин оролдоно уу" });
      if (message === "IDEMPOTENCY_KEY_CONFLICT")
        return res.status(409).json({ message: "Төлбөрийн хүсэлт давхардсан байна" });
      if (message.startsWith("PAYMENT_VALIDATION:"))
        return res.status(409).json({ message: message.slice(19) });
      throw error;
    }
    if (!result.alreadyConfirmed) {
      void prisma.auditLog.create({
        data: {
          userId: actor.userId,
          action: AuditAction.PAYMENT_STATUS_CHANGED,
          ip: req.ip,
          userAgent: req.get("user-agent") || null,
          meta: {
            vendorId: req.params.vendorId,
            paymentId: payment.id,
            amount: result.amount,
            paymentMethod: "CASH",
            source: "SALES_REPRESENTATIVE",
          },
        },
      });
    }

    return res.json({
      status: result.status,
      paymentId: payment.id,
      amount: result.amount,
      paidAmount: result.paidAmount,
      outstandingAmount: result.outstandingAmount,
      paymentMethod: "CASH",
      alreadyConfirmed: result.alreadyConfirmed,
    });
  },
);

router.get(
  "/sales-representative/vendors/:vendorId/payments/:paymentId/qpay/status",
  requireAuth,
  async (req, res) => {
    const actor = (req as any).user as AuthPayload;
    const current = await membership(actor);
    if (!current || !requireRepresentative(current))
      return res
        .status(403)
        .json({ message: "Худалдааны төлөөлөгчийн эрх шаардлагатай" });
    const payment = await representativePayment(
      current,
      req.params.vendorId,
      req.params.paymentId,
    );
    if (!payment) return res.status(404).json({ message: "Төлбөр олдсонгүй" });
    if (payment.status === PaymentStatus.PAID)
      return res.json({ status: "PAID" });
    if (!payment.transactionId) return res.json({ status: "PENDING" });
    try {
      const minuAccount = await getStockMinuPaymentAccount(
        payment.transactionId,
      );
      const paymentCheck = await checkSystemQrPayment(
        {
          merchantCode: minuAccount.merchantCode,
          invoiceNumber: payment.transactionId,
        },
        minuAccount.username,
        minuAccount.password,
      );
      if (!paymentCheck.paid) return res.json({ status: "PENDING" });
      const result = await confirmRepresentativeQPayEntry(
        payment.id,
        payment.transactionId,
      );
      return res.json(result);
    } catch (error) {
      console.error("sales representative qpay status error", error);
      return res
        .status(502)
        .json({ message: "QPay төлбөр шалгахад алдаа гарлаа" });
    }
  },
);

router.post(
  "/sales-representative/vendors/:vendorId/payments/:paymentId/qpay/dev-confirm",
  requireAuth,
  async (req, res) => {
    if (process.env.MGL_LOCAL_DEV !== "true")
      return res.status(404).json({ message: "Endpoint олдсонгүй" });
    const current = await membership((req as any).user as AuthPayload);
    if (!current || !requireRepresentative(current))
      return res
        .status(403)
        .json({ message: "Худалдааны төлөөлөгчийн эрх шаардлагатай" });
    const payment = await representativePayment(
      current,
      req.params.vendorId,
      req.params.paymentId,
    );
    if (!payment) return res.status(404).json({ message: "Төлбөр олдсонгүй" });
    if (!canPayApprovedStockRequest(payment.request.status))
      return res.status(409).json({
        code: "STOCK_REQUEST_NOT_APPROVED",
        message: "Админ зөвшөөрсний дараа төлбөр баталгаажна",
      });
    if (!payment.transactionId?.startsWith("DEV-QPAY-"))
      return res.status(400).json({ message: "Туршилтын QR биш байна" });
    const result = await confirmRepresentativeQPayEntry(
      payment.id,
      payment.transactionId,
    );
    return res.json({ ...result, paymentId: payment.id });
  },
);

router.patch(
  "/sales-representative/vendors/:vendorId",
  requireAuth,
  async (req, res) => {
    const current = await membership((req as any).user as AuthPayload);
    if (!current || !requireRepresentative(current))
      return res
        .status(403)
        .json({ message: "Худалдааны төлөөлөгчийн эрх шаардлагатай" });
    const details = salesVendorDetails(req.body as Record<string, unknown>);
    if (!details)
      return res.status(400).json({
        message:
          "Нэр, регистр, эзний нэр, имэйл, утас, хаяг болон GPS байршил шаардлагатай",
      });

    const location = await prisma.salesVisitLocation.findFirst({
      where: {
        organizationId: current.organizationId,
        vendorOrganizationId: req.params.vendorId,
        isActive: true,
        assignments: { some: { memberId: current.id } },
      },
      select: { id: true },
    });
    if (!location)
      return res
        .status(404)
        .json({ message: "Засах эрхтэй дэлгүүр олдсонгүй" });

    try {
      const result = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const vendor = await tx.organization.update({
            where: { id: req.params.vendorId },
            data: {
              name: details.name,
              taxId: details.taxId,
              email: details.ownerEmail,
              phone: details.ownerPhone,
              address: details.address,
              businessCategory:
                details.storeType === "GROCERY"
                  ? "market-food-grocery"
                  : "other",
            },
          });
          const updatedLocation = await tx.salesVisitLocation.update({
            where: { id: location.id },
            data: {
              name: details.name,
              address: details.address,
              latitude: details.point.latitude,
              longitude: details.point.longitude,
              contactName: details.ownerName,
              contactPhone: details.ownerPhone,
            },
          });
          return { vendor, location: updatedLocation, inviteLink: null };
        },
      );
      return res.json(result);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        return res
          .status(409)
          .json({ message: "Регистр эсвэл холбоо барих мэдээлэл давхардлаа" });
      throw error;
    }
  },
);

router.post("/sales-representative/vendors", requireAuth, async (req, res) => {
  const actor = (req as any).user as AuthPayload;
  const current = await membership(actor);
  if (!current || !canRegisterSalesVendor(current.role, current.capabilities))
    return res
      .status(403)
      .json({ message: "Дэлгүүр бүртгэх эрх шаардлагатай" });
  const representative = requireRepresentative(current);
  const body = req.body as Record<string, unknown>;
  const existingVendorId =
    typeof body.vendorId === "string" ? body.vendorId.trim() : "";
  const details = salesVendorDetails(body);
  if (!details) {
    return res.status(400).json({
      message:
        "Нэр, регистр, эзний нэр, утас, хаяг болон GPS байршил шаардлагатай",
    });
  }
  const {
    name,
    taxId,
    ownerName,
    ownerEmail,
    ownerPhone,
    address,
    point,
    storeType,
  } = details;

  if (existingVendorId) {
    const existingVendor = await prisma.organization.findFirst({
      where: {
        id: existingVendorId,
        status: OrgStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        taxId: true,
        email: true,
        phone: true,
        address: true,
        businessCategory: true,
      },
    });
    if (!existingVendor)
      return res.status(404).json({ message: "Бүртгэлтэй дэлгүүр олдсонгүй" });

    const existingLocation = await prisma.salesVisitLocation.findUnique({
      where: { vendorOrganizationId: existingVendor.id },
      select: { id: true, organizationId: true },
    });
    if (
      existingLocation &&
      existingLocation.organizationId !== current!.organizationId
    )
      return res.status(409).json({
        message: "Энэ дэлгүүр өөр байгууллагын төлөөлөгчид бүртгэлтэй байна",
      });

    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const vendor = await tx.organization.update({
          where: { id: existingVendor.id },
          data: {
            ...(!existingVendor.taxId && { taxId }),
            ...(!existingVendor.email && ownerEmail && { email: ownerEmail }),
            ...(!existingVendor.phone && { phone: ownerPhone }),
            ...(!existingVendor.address && { address }),
            ...(!existingVendor.businessCategory && {
              businessCategory:
                storeType === "GROCERY" ? "market-food-grocery" : "other",
            }),
          },
        });
        const location = existingLocation
          ? await tx.salesVisitLocation.update({
              where: { id: existingLocation.id },
              data: {
                name: vendor.name,
                address,
                latitude: point.latitude,
                longitude: point.longitude,
                contactName: ownerName,
                contactPhone: ownerPhone,
                isActive: true,
                ...(representative && {
                  assignments: {
                    upsert: {
                      where: {
                        locationId_memberId: {
                          locationId: existingLocation.id,
                          memberId: current!.id,
                        },
                      },
                      create: { memberId: current!.id },
                      update: {},
                    },
                  },
                }),
              },
            })
          : await tx.salesVisitLocation.create({
              data: {
                organizationId: current!.organizationId,
                vendorOrganizationId: vendor.id,
                name: vendor.name,
                address,
                latitude: point.latitude,
                longitude: point.longitude,
                contactName: ownerName,
                contactPhone: ownerPhone,
                ...(representative && {
                  assignments: { create: [{ memberId: current!.id }] },
                }),
              },
            });
        return { vendor, location, inviteLink: null };
      },
    );
    return res.status(existingLocation ? 200 : 201).json(result);
  }

  const duplicate = await prisma.organization.findFirst({
    where: {
      OR: [{ taxId }, ...(ownerEmail ? [{ email: ownerEmail }] : [])],
      deletedAt: null,
    },
    select: { id: true },
  });
  if (duplicate)
    return res.status(409).json({
      message: "Энэ регистр эсвэл имэйлээр байгууллага бүртгэлтэй байна",
    });
  const existingUser = ownerEmail
    ? await prisma.user.findUnique({
        where: { email: ownerEmail },
        select: {
          id: true,
          passwordHash: true,
          organizationMemberships: {
            where: { isActive: true },
            select: { id: true },
            take: 1,
          },
        },
      })
    : null;
  const inviteToken =
    ownerEmail && !existingUser?.passwordHash
      ? crypto.randomBytes(32).toString("hex")
      : null;
  const expiresAt = inviteToken
    ? new Date(Date.now() + 24 * 60 * 60 * 1000)
    : null;
  const result = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const vendor = await tx.organization.create({
        data: {
          name,
          slug: normalizedSlug(name),
          taxId,
          type: OrgType.VENDOR,
          status: OrgStatus.ACTIVE,
          email: ownerEmail,
          phone: ownerPhone,
          address,
          businessCategory:
            storeType === "GROCERY" ? "market-food-grocery" : "other",
          isVerified: false,
        },
      });
      if (ownerEmail) {
        const owner =
          existingUser ??
          (await tx.user.create({
            data: {
              email: ownerEmail,
              role: PlatformRole.USER,
              isActive: true,
              emailVerified: false,
              onboardingSource: OnboardingSource.ADMIN,
            },
            select: {
              id: true,
              passwordHash: true,
              organizationMemberships: { select: { id: true }, take: 1 },
            },
          }));
        await tx.profile.upsert({
          where: { userId: owner.id },
          // Existing account details belong to the owner and must not be
          // overwritten by a representative-entered contact record.
          update: {},
          create: {
            userId: owner.id,
            fullName: ownerName,
            phoneNumber: ownerPhone,
          },
        });
        await tx.organizationMember.create({
          data: {
            userId: owner.id,
            organizationId: vendor.id,
            role: "OWNER",
            isPrimary: owner.organizationMemberships.length === 0,
            isActive: true,
          },
        });
        if (inviteToken && expiresAt)
          await tx.vendorSetupToken.create({
            data: { userId: owner.id, token: inviteToken, expiresAt },
          });
      }
      const location = await tx.salesVisitLocation.create({
        data: {
          organizationId: current!.organizationId,
          vendorOrganizationId: vendor.id,
          name,
          address,
          latitude: point.latitude,
          longitude: point.longitude,
          contactName: ownerName,
          contactPhone: ownerPhone,
          ...(representative && {
            assignments: { create: [{ memberId: current!.id }] },
          }),
        },
      });
      return { vendor, location };
    },
  );
  const appUrl = process.env.VENDOR_APP_URL || "https://vendor.mglstore.mn";
  return res.status(201).json({
    ...result,
    inviteLink: inviteToken
      ? `${appUrl}/set-password?token=${inviteToken}`
      : null,
  });
});

router.get(
  "/sales-representative/warehouses",
  requireAuth,
  async (req, res) => {
    const current = await membership((req as any).user as AuthPayload);
    if (!requireRepresentative(current))
      return res
        .status(403)
        .json({ message: "Худалдааны төлөөлөгчийн эрх шаардлагатай" });
    return res.json(
      await prisma.warehouse.findMany({
        where: { type: WarehouseType.CENTRAL, isActive: true, deletedAt: null },
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          district: true,
          phone: true,
        },
        orderBy: { name: "asc" },
      }),
    );
  },
);

export const salesProductSearchFilter = (search: string) =>
  search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { barcode: { contains: search, mode: "insensitive" as const } },
          { sku: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

router.get(
  "/sales-representative/warehouses/:warehouseId/products",
  requireAuth,
  async (req, res) => {
    const current = await membership((req as any).user as AuthPayload);
    if (!requireRepresentative(current))
      return res
        .status(403)
        .json({ message: "Худалдааны төлөөлөгчийн эрх шаардлагатай" });
    const warehouse = await prisma.warehouse.findFirst({
      where: {
        id: req.params.warehouseId,
        type: WarehouseType.CENTRAL,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!warehouse)
      return res
        .status(404)
        .json({ message: "Идэвхтэй төв агуулах олдсонгүй" });
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const rows = await prisma.warehouseInventory.findMany({
      where: {
        warehouseId: warehouse.id,
        quantity: { gt: 0 },
        product: {
          deletedAt: null,
          ...salesProductSearchFilter(search),
        },
      },
      include: {
        product: {
          include: {
            images: { take: 1 },
            category: { select: { name: true } },
            businessCategory: { select: { name: true } },
          },
        },
      },
      orderBy: { product: { name: "asc" } },
      take: 200,
    });
    return res.json(rows);
  },
);

// Order history created by the signed-in sales representative on behalf of their
// assigned stores. Keep this scoped to the actor: representatives must not see
// another representative's customer portfolio or order history.
router.get("/sales-representative/orders", requireAuth, async (req, res) => {
  const actor = (req as any).user as AuthPayload;
  const current = await membership(actor);
  if (!requireRepresentative(current))
    return res
      .status(403)
      .json({ message: "Худалдааны төлөөлөгчийн эрх шаардлагатай" });

  const orders = await prisma.warehouseStockRequest.findMany({
    where: {
      requestedById: actor.userId,
      note: { startsWith: "[Х/Т захиалга]" },
    },
    select: {
      id: true,
      requestNumber: true,
      status: true,
      requestedAt: true,
      note: true,
      deliveryAddress: true,
      organization: {
        select: {
          id: true,
          name: true,
          businessCategory: true,
          address: true,
        },
      },
      warehouse: { select: { id: true, name: true } },
      payment: {
        select: {
          totalAmount: true,
          paidAmount: true,
          status: true,
        },
      },
      items: {
        select: {
          quantity: true,
          approvedQuantity: true,
          product: {
            select: { id: true, name: true, sku: true, price: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { requestedAt: "desc" },
    take: 100,
  });

  return res.json(
    orders.map((order) => ({
      ...order,
      payment: order.payment
        ? {
            ...order.payment,
            totalAmount: order.payment.totalAmount.toString(),
            paidAmount: order.payment.paidAmount.toString(),
          }
        : null,
      items: order.items.map((item) => ({
        ...item,
        product: { ...item.product, price: item.product.price.toString() },
      })),
    })),
  );
});

router.post(
  "/sales-representative/vendors/:vendorId/orders",
  requireAuth,
  async (req, res) => {
    const actor = (req as any).user as AuthPayload;
    const current = await membership(actor);
    if (!requireRepresentative(current))
      return res
        .status(403)
        .json({ message: "Худалдааны төлөөлөгчийн эрх шаардлагатай" });
    const access = await representativeVendorAccess(
      current!,
      req.params.vendorId,
    );
    if (!access)
      return res
        .status(404)
        .json({ message: "Таны бүртгэсэн vendor олдсонгүй" });
    const outstandingPayments = await getOutstandingStockPayments(
      req.params.vendorId,
    );
    if (outstandingPayments.length > 0)
      return res.status(409).json({
        code: "OUTSTANDING_STOCK_PAYMENT",
        message: "Өмнөх төлбөрийг төлсний дараа шинэ захиалга үүсгэнэ",
        totalOutstanding: outstandingPayments.reduce(
          (total, payment) => total + payment.outstandingAmount,
          0,
        ),
        payments: outstandingPayments.map(serializeOutstandingPayment),
      });
    const body = req.body as Record<string, unknown>;
    const warehouseId =
      typeof body.warehouseId === "string" ? body.warehouseId.trim() : "";
    const rawItems = Array.isArray(body.items) ? body.items : [];
    const items = rawItems
      .filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === "object" && !Array.isArray(item),
      )
      .map((item) => ({
        productId: typeof item.productId === "string" ? item.productId : "",
        quantity: Number(item.quantity),
        note: typeof item.note === "string" ? item.note.trim() : null,
      }));
    if (
      !warehouseId ||
      items.length !== rawItems.length ||
      items.length === 0 ||
      items.some(
        (item) =>
          !item.productId ||
          !Number.isSafeInteger(item.quantity) ||
          item.quantity <= 0,
      )
    )
      return res
        .status(400)
        .json({ message: "Агуулах болон барааны мэдээлэл буруу байна" });
    const uniqueProductIds = new Set(items.map((item) => item.productId));
    if (uniqueProductIds.size !== items.length)
      return res
        .status(400)
        .json({ message: "Нэг барааг захиалгад давхар оруулж болохгүй" });
    const warehouse = await prisma.warehouse.findFirst({
      where: {
        id: warehouseId,
        type: WarehouseType.CENTRAL,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!warehouse)
      return res
        .status(404)
        .json({ message: "Идэвхтэй төв агуулах олдсонгүй" });
    const inventory = await prisma.warehouseInventory.findMany({
      where: {
        warehouseId: warehouse.id,
        productId: { in: [...uniqueProductIds] },
        quantity: { gt: 0 },
        product: { deletedAt: null },
      },
      include: { product: { select: { name: true, price: true } } },
    });
    if (inventory.length !== uniqueProductIds.size)
      return res
        .status(400)
        .json({ message: "Сонгосон бараа агуулахад байхгүй байна" });
    let totalAmount = new Prisma.Decimal(0);
    for (const item of items) {
      const stock = inventory.find(
        (entry) => entry.productId === item.productId,
      )!;
      if (stock.quantity < item.quantity)
        return res.status(409).json({
          message: `${stock.product.name}-ийн үлдэгдэл хүрэлцэхгүй байна`,
        });
      totalAmount = totalAmount.plus(
        new Prisma.Decimal(stock.product.price).times(item.quantity),
      );
    }
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const order = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const created = await tx.warehouseStockRequest.create({
          data: {
            requestNumber: `SR-${suffix}`,
            organizationId: req.params.vendorId,
            warehouseId: warehouse.id,
            requestedById: actor.userId,
            note:
              typeof body.note === "string"
                ? `[Х/Т захиалга] ${body.note.trim()}`
                : "[Х/Т захиалга]",
            deliveryAddress:
              access.location?.address || access.vendor.address || null,
            deliveryPhone:
              access.location?.contactPhone || access.vendor.phone || null,
            status: StockRequestStatus.PENDING,
            items: { create: items },
          },
        });
        await tx.stockRequestPayment.create({
          data: {
            invoiceNumber: `SRI-${suffix}`,
            requestId: created.id,
            organizationId: req.params.vendorId,
            totalAmount,
            status: PaymentStatus.PENDING,
            dueDate: new Date(Date.now() + 7 * 86400000),
          },
        });
        return tx.warehouseStockRequest.findUnique({
          where: { id: created.id },
          include: {
            items: { include: { product: true } },
            warehouse: true,
            organization: true,
            payment: true,
          },
        });
      },
    );
    void prisma.auditLog.create({
      data: {
        userId: actor.userId,
        action: AuditAction.SALES_REP_VENDOR_ORDER_CREATED,
        ip: req.ip,
        userAgent: req.get("user-agent") || null,
        meta: {
          vendorId: req.params.vendorId,
          warehouseId: warehouse.id,
          stockRequestId: order?.id,
          representativeOrganizationId: current!.organizationId,
        },
      },
    });
    if (order?.id) {
      void notifyNewSalesRepresentativeStockRequest(order.id).catch((error) => {
        console.error("sales representative stock request notification error", {
          requestId: order.id,
          error,
        });
      });
    }
    return res.status(201).json(order);
  },
);

router.get("/sales-representative/locations", requireAuth, async (req, res) => {
  const current = await membership((req as any).user as AuthPayload);
  if (!current)
    return res.status(403).json({ message: "Байгууллагын эрх олдсонгүй" });
  const manager = MANAGER_ROLES.has(current.role);
  if (
    !manager &&
    !current.capabilities.includes(Capability.SALES_REPRESENTATIVE)
  ) {
    return res
      .status(403)
      .json({ message: "Худалдааны төлөөлөгчийн эрх шаардлагатай" });
  }
  const locations = await prisma.salesVisitLocation.findMany({
    where: {
      organizationId: current.organizationId,
      isActive: true,
      ...(!manager && { assignments: { some: { memberId: current.id } } }),
    },
    include: {
      assignments: { select: { memberId: true } },
      visits: {
        where: manager ? undefined : { userId: (req as any).user.userId },
        orderBy: { checkedInAt: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });
  return res.json(
    locations.map(({ assignments, visits, ...location }) => ({
      ...location,
      assignedMemberIds: assignments.map((item) => item.memberId),
      latestVisit: visits[0] ?? null,
    })),
  );
});

router.post(
  "/sales-representative/locations",
  requireAuth,
  async (req, res) => {
    const current = await membership((req as any).user as AuthPayload);
    if (!current || !MANAGER_ROLES.has(current.role)) {
      return res
        .status(403)
        .json({ message: "Дэлгүүр бүртгэх эрх хүрэлцэхгүй" });
    }
    const body = req.body as Record<string, unknown>;
    const point = coordinates(body);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";
    if (!name || !address || !point) {
      return res
        .status(400)
        .json({ message: "Нэр, хаяг, байршлын цэг шаардлагатай" });
    }
    const assignedMemberIds = await validRepresentativeIds(
      current.organizationId,
      body.assignedMemberIds,
    );
    const location = await prisma.salesVisitLocation.create({
      data: {
        organizationId: current.organizationId,
        name,
        address,
        ...point,
        radiusMeters:
          typeof body.radiusMeters === "number"
            ? Math.min(1_000, Math.max(50, Math.round(body.radiusMeters)))
            : 150,
        contactName:
          typeof body.contactName === "string"
            ? body.contactName.trim() || null
            : null,
        contactPhone:
          typeof body.contactPhone === "string"
            ? body.contactPhone.trim() || null
            : null,
        assignments: {
          create: assignedMemberIds.map((memberId) => ({ memberId })),
        },
      },
    });
    return res.status(201).json(location);
  },
);

router.patch(
  "/sales-representative/locations/:locationId",
  requireAuth,
  async (req, res) => {
    const current = await membership((req as any).user as AuthPayload);
    if (!current || !MANAGER_ROLES.has(current.role)) {
      return res.status(403).json({ message: "Дэлгүүр засах эрх хүрэлцэхгүй" });
    }
    const existing = await prisma.salesVisitLocation.findFirst({
      where: {
        id: req.params.locationId,
        organizationId: current.organizationId,
      },
    });
    if (!existing)
      return res.status(404).json({ message: "Дэлгүүр олдсонгүй" });
    const body = req.body as Record<string, unknown>;
    const assignedMemberIds =
      body.assignedMemberIds === undefined
        ? null
        : await validRepresentativeIds(
            current.organizationId,
            body.assignedMemberIds,
          );
    const updated = await prisma.$transaction(async (tx) => {
      if (assignedMemberIds !== null) {
        await tx.salesVisitLocationAssignment.deleteMany({
          where: { locationId: existing.id },
        });
        if (assignedMemberIds.length > 0) {
          await tx.salesVisitLocationAssignment.createMany({
            data: assignedMemberIds.map((memberId) => ({
              locationId: existing.id,
              memberId,
            })),
            skipDuplicates: true,
          });
        }
      }
      return tx.salesVisitLocation.update({
        where: { id: existing.id },
        data: locationFields(body),
        include: { assignments: { select: { memberId: true } } },
      });
    });
    return res.json({
      ...updated,
      assignedMemberIds: updated.assignments.map(({ memberId }) => memberId),
    });
  },
);

router.delete(
  "/sales-representative/locations/:locationId",
  requireAuth,
  async (req, res) => {
    const current = await membership((req as any).user as AuthPayload);
    if (!current || !MANAGER_ROLES.has(current.role)) {
      return res
        .status(403)
        .json({ message: "Дэлгүүр идэвхгүй болгох эрх хүрэлцэхгүй" });
    }
    const result = await prisma.salesVisitLocation.updateMany({
      where: {
        id: req.params.locationId,
        organizationId: current.organizationId,
      },
      data: { isActive: false },
    });
    if (result.count === 0)
      return res.status(404).json({ message: "Дэлгүүр олдсонгүй" });
    return res.status(204).send();
  },
);

router.get("/sales-representative/visits", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthPayload;
  const current = await membership(user);
  if (!current)
    return res.status(403).json({ message: "Байгууллагын эрх олдсонгүй" });
  const manager = MANAGER_ROLES.has(current.role);
  if (
    !manager &&
    !current.capabilities.includes(Capability.SALES_REPRESENTATIVE)
  ) {
    return res
      .status(403)
      .json({ message: "Худалдааны төлөөлөгчийн эрх шаардлагатай" });
  }
  const from = optionalDate(req.query.from);
  const to = optionalDate(req.query.to);
  const representativeId =
    typeof req.query.representativeId === "string"
      ? req.query.representativeId
      : null;
  const visits = await prisma.salesVisit.findMany({
    where: {
      organizationId: current.organizationId,
      ...(!manager && { userId: user.userId }),
      ...(manager && representativeId && { userId: representativeId }),
      ...((from || to) && {
        checkedInAt: { ...(from && { gte: from }), ...(to && { lte: to }) },
      }),
    },
    include: {
      location: { select: { id: true, name: true, address: true } },
      user: {
        select: {
          id: true,
          profile: { select: { fullName: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { checkedInAt: "desc" },
    take: 500,
  });
  return res.json(
    visits.map((visit) => ({
      ...visit,
      representativeName:
        visit.user.profile?.fullName || "Худалдааны төлөөлөгч",
      representativeAvatarUrl: visit.user.profile?.avatarUrl ?? null,
    })),
  );
});

router.get("/sales-representative/summary", requireAuth, async (req, res) => {
  const current = await membership((req as any).user as AuthPayload);
  if (!current || !MANAGER_ROLES.has(current.role)) {
    return res.status(403).json({ message: "Тайлан харах эрх хүрэлцэхгүй" });
  }
  const from =
    optionalDate(req.query.from) ?? new Date(new Date().setHours(0, 0, 0, 0));
  const visits = await prisma.salesVisit.findMany({
    where: {
      organizationId: current.organizationId,
      checkedInAt: { gte: from },
    },
    select: {
      checkedOutAt: true,
      durationMinutes: true,
      promotedProductIds: true,
      userId: true,
      locationId: true,
    },
  });
  const completed = visits.filter((visit) => visit.checkedOutAt !== null);
  return res.json({
    totalVisits: visits.length,
    completedVisits: completed.length,
    activeVisits: visits.length - completed.length,
    uniqueStores: new Set(visits.map((visit) => visit.locationId)).size,
    activeRepresentatives: new Set(visits.map((visit) => visit.userId)).size,
    promotedProducts: new Set(
      completed.flatMap((visit) => visit.promotedProductIds),
    ).size,
    averageDurationMinutes:
      completed.length === 0
        ? 0
        : Math.round(
            completed.reduce(
              (sum, visit) => sum + (visit.durationMinutes ?? 0),
              0,
            ) / completed.length,
          ),
  });
});

router.post(
  "/sales-representative/locations/:locationId/check-in",
  requireAuth,
  async (req, res) => {
    const user = (req as any).user as AuthPayload;
    const current = await membership(user);
    const point = coordinates(req.body);
    if (
      !current ||
      !current.capabilities.includes(Capability.SALES_REPRESENTATIVE)
    ) {
      return res
        .status(403)
        .json({ message: "Худалдааны төлөөлөгчийн эрх шаардлагатай" });
    }
    if (!point)
      return res.status(400).json({ message: "GPS байршил шаардлагатай" });
    const location = await prisma.salesVisitLocation.findFirst({
      where: {
        id: req.params.locationId,
        organizationId: current.organizationId,
        isActive: true,
        assignments: { some: { memberId: current.id } },
      },
    });
    if (!location)
      return res.status(404).json({ message: "Оноосон дэлгүүр олдсонгүй" });
    const distance = distanceMeters(
      point.latitude,
      point.longitude,
      location.latitude,
      location.longitude,
    );
    if (distance > location.radiusMeters) {
      return res.status(409).json({
        message: `Дэлгүүрийн бүсээс гадуур байна (${Math.round(distance)}м)`,
        distanceMeters: Math.round(distance),
        requiredRadiusMeters: location.radiusMeters,
      });
    }
    const openVisit = await prisma.salesVisit.findFirst({
      where: { userId: user.userId, checkedOutAt: null },
    });
    if (openVisit)
      return res
        .status(409)
        .json({ message: "Өмнөх айлчлалаа эхлээд дуусгана уу" });
    const visit = await prisma.salesVisit.create({
      data: {
        organizationId: current.organizationId,
        locationId: location.id,
        userId: user.userId,
        checkedInLatitude: point.latitude,
        checkedInLongitude: point.longitude,
      },
    });
    return res.status(201).json(visit);
  },
);

router.post(
  "/sales-representative/visits/:visitId/check-out",
  requireAuth,
  async (req, res) => {
    const user = (req as any).user as AuthPayload;
    const current = await membership(user);
    const point = coordinates(req.body);
    if (!current || !point)
      return res.status(400).json({ message: "GPS байршил шаардлагатай" });
    const visit = await prisma.salesVisit.findFirst({
      where: {
        id: req.params.visitId,
        userId: user.userId,
        organizationId: current.organizationId,
        checkedOutAt: null,
      },
      include: { location: true },
    });
    if (!visit)
      return res.status(404).json({ message: "Идэвхтэй айлчлал олдсонгүй" });
    const distance = distanceMeters(
      point.latitude,
      point.longitude,
      visit.location.latitude,
      visit.location.longitude,
    );
    if (distance > visit.location.radiusMeters) {
      return res.status(409).json({
        message: `Дэлгүүрийн бүсээс гадуур байна (${Math.round(distance)}м)`,
      });
    }
    const body = req.body as Record<string, unknown>;
    const promotedProductIds = Array.isArray(body.promotedProductIds)
      ? body.promotedProductIds.filter(
          (id): id is string => typeof id === "string",
        )
      : [];
    if (promotedProductIds.length > 0) {
      const validProductCount = await prisma.product.count({
        where: {
          id: { in: promotedProductIds },
          organizationId: current.organizationId,
          deletedAt: null,
        },
      });
      if (validProductCount !== new Set(promotedProductIds).size) {
        return res.status(400).json({
          message: "Сурталчилсан бүтээгдэхүүний мэдээлэл буруу байна",
        });
      }
    }
    const checkedOutAt = new Date();
    const updated = await prisma.salesVisit.update({
      where: { id: visit.id },
      data: {
        checkedOutAt,
        checkedOutLatitude: point.latitude,
        checkedOutLongitude: point.longitude,
        durationMinutes: Math.max(
          0,
          Math.round(
            (checkedOutAt.getTime() - visit.checkedInAt.getTime()) / 60_000,
          ),
        ),
        note: typeof body.note === "string" ? body.note.trim() || null : null,
        promotedProductIds,
      },
    });
    return res.json(updated);
  },
);

export default router;
