import { Router, type Router as ExpressRouter } from "express";
import {
  prisma,
  ApprovalStatus,
  AssociationMembershipType,
  PaymentMethod,
  PaymentStatus,
  PosQPayStatus,
  type Prisma,
} from "@mgl/database";
import { requireAuth, requirePlatformPermission } from "../../middleware/auth";
import { Permission } from "@mgl/types";
import {
  checkSystemQrPayment,
  createSystemQrInvoice,
} from "../../services/systemqr";

const router: ExpressRouter = Router();

async function getAssociationConfig() {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: "association_config" },
  });
  if (!setting) return null;
  try {
    return JSON.parse(setting.value);
  } catch {
    return null;
  }
}

const MEMBERSHIP_PRICE_MATRIX: Partial<
  Record<AssociationMembershipType, Record<number, number>>
> = {
  [AssociationMembershipType.ACTIVE]: {
    1: 30000,
    6: 180000,
  },
  [AssociationMembershipType.BRANCH_COUNCIL]: {
    1: 50000,
    6: 300000,
  },
  [AssociationMembershipType.GOVERNING_COUNCIL]: {
    1: 100000,
    6: 600000,
  },
};

function isPaidMembershipType(
  value: unknown,
): value is AssociationMembershipType {
  return Boolean(
    value &&
    typeof value === "string" &&
    MEMBERSHIP_PRICE_MATRIX[value as AssociationMembershipType],
  );
}

async function resolveMembershipPrice(
  membershipType: AssociationMembershipType,
  durationMonths?: number | null,
) {
  const duration = Number(durationMonths);
  return MEMBERSHIP_PRICE_MATRIX[membershipType]?.[duration] || 0;
}

function getApiRouteBaseUrl(req: any) {
  const configured =
    process.env.API_PUBLIC_URL ||
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL;
  const normalized = configured
    ?.trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/+$/, "");
  if (normalized)
    return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
  return `${req.protocol}://${req.get("host")}/api`;
}

function associationSaleReference(registrationId: string) {
  return `ASSOCIATION-${registrationId}`;
}

function addMonths(date: Date, months?: number | null) {
  const safeMonths = Math.max(1, Number(months || 1));
  const next = new Date(date);
  next.setMonth(next.getMonth() + safeMonths);
  return next;
}

function laterDate(a: Date | null | undefined, b: Date) {
  if (!a) return b;
  return a.getTime() > b.getTime() ? a : b;
}

function normalizePhone(value?: string | null) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  if (digits.startsWith("976") && digits.length === 11) return digits.slice(3);
  return digits;
}

type PrismaLike = Prisma.TransactionClient | typeof prisma;

async function findUserByAssociationPhone(tx: PrismaLike, phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  const candidates = await tx.user.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      OR: [
        { membershipDiscountPhone: { contains: normalized } },
        { profile: { phoneNumber: { contains: normalized } } },
        { membershipDiscountPhone: { contains: phone.trim() } },
        { profile: { phoneNumber: { contains: phone.trim() } } },
      ],
    },
    select: {
      id: true,
      membershipExpiresAt: true,
      membershipDiscountPhone: true,
      profile: { select: { phoneNumber: true } },
    },
    take: 10,
  });

  return (
    candidates.find(
      (user) =>
        normalizePhone(user.profile?.phoneNumber) === normalized ||
        normalizePhone(user.membershipDiscountPhone) === normalized,
    ) ||
    candidates[0] ||
    null
  );
}

async function syncApprovedAssociationMembership(
  tx: PrismaLike,
  registration: {
    id: string;
    phone: string;
    durationMonths: number | null;
    paidAt: Date | null;
    reviewedAt: Date | null;
    status: ApprovalStatus;
    paymentStatus: PaymentStatus;
  },
) {
  if (
    registration.status !== ApprovalStatus.APPROVED ||
    registration.paymentStatus !== PaymentStatus.PAID
  ) {
    return null;
  }

  const user = await findUserByAssociationPhone(tx, registration.phone);
  if (!user) return null;

  const paidAt = registration.paidAt || registration.reviewedAt || new Date();
  const expiresAt = addMonths(paidAt, registration.durationMonths);
  const membershipExpiresAt = laterDate(user.membershipExpiresAt, expiresAt);
  const membershipDiscountPhone =
    normalizePhone(registration.phone) ||
    user.membershipDiscountPhone ||
    user.profile?.phoneNumber?.trim() ||
    null;

  return tx.user.update({
    where: { id: user.id },
    data: {
      isPrime: true,
      membershipPaidAt: paidAt,
      membershipStartedAt: paidAt,
      membershipExpiresAt,
      membershipDiscountPhone,
    },
    select: {
      id: true,
      membershipExpiresAt: true,
      membershipDiscountPhone: true,
    },
  });
}

function getAssociationPaymentAccount(config: any) {
  const account = config?.paymentAccount || {};
  return {
    merchantCode: String(account.merchantCode || "").trim(),
    username: String(account.username || account.merchantCode || "").trim(),
    password: String(account.password || "").trim(),
    bankCode: String(account.bankCode || "").trim(),
    accountNumber: String(account.accountNumber || "").trim(),
    accountName: String(account.accountName || "").trim(),
  };
}

function getAssociationConfigMessage(
  config: any,
  key: string,
  fallback: string,
) {
  return String(config?.upgradeModal?.[key] || fallback).trim();
}

function optionalRegistrationAddress(value: unknown) {
  const address = typeof value === "string" ? value.trim() : "";
  return address || "Хаяг бүртгээгүй";
}

function publicAssociationConfig(config: any) {
  if (!config || typeof config !== "object") return config;
  const paymentAccount = config.paymentAccount || {};

  return {
    ...config,
    paymentAccount: {
      bankName: String(paymentAccount.bankName || ""),
      bankCode: String(paymentAccount.bankCode || ""),
      accountNumber: String(paymentAccount.accountNumber || ""),
      accountName: String(paymentAccount.accountName || ""),
      description: String(paymentAccount.description || ""),
    },
  };
}

async function refreshAssociationInvoicePayment(invoiceId: string) {
  const invoice = await prisma.qPayInvoice.findUnique({
    where: { id: invoiceId },
  });
  if (!invoice) return null;
  if (invoice.status === PosQPayStatus.PAID) return invoice;
  if (
    invoice.status !== PosQPayStatus.PENDING &&
    invoice.status !== PosQPayStatus.EXPIRED
  ) {
    return invoice;
  }

  const payload = (
    invoice.webhookPayload && typeof invoice.webhookPayload === "object"
      ? invoice.webhookPayload
      : {}
  ) as Record<string, any>;
  const config = await getAssociationConfig();
  const account = getAssociationPaymentAccount(config);
  const merchantCode = String(
    payload.merchantCode || account.merchantCode || "",
  ).trim();
  const invoiceNumber = String(
    payload.providerInvoiceId || payload.systemQrInvoiceNumber || "",
  ).trim();
  const username = String(
    payload.username || account.username || merchantCode,
  ).trim();
  const password = account.password;
  if (!merchantCode || !invoiceNumber || !password) return invoice;

  const status = await checkSystemQrPayment(
    { merchantCode, invoiceNumber },
    username,
    password,
  );
  const rawStatus = String(
    (status as any)?.raw?.status || (status as any)?.status || "",
  ).toUpperCase();
  const isPaid =
    Boolean((status as any)?.paid) ||
    ["PAID", "SUCCESS", "SUCCESSFUL", "000"].includes(rawStatus);
  if (!isPaid) {
    if (invoice.expiresAt <= new Date()) {
      return prisma.qPayInvoice.update({
        where: { id: invoice.id },
        data: {
          status: PosQPayStatus.EXPIRED,
          webhookPayload: {
            ...payload,
            lastPaymentCheck: status as unknown as Prisma.JsonObject,
          } as unknown as Prisma.JsonObject,
        },
      });
    }

    return prisma.qPayInvoice.update({
      where: { id: invoice.id },
      data: {
        webhookPayload: {
          ...payload,
          lastPaymentCheck: status as unknown as Prisma.JsonObject,
        } as unknown as Prisma.JsonObject,
      },
    });
  }

  return prisma.qPayInvoice.update({
    where: { id: invoice.id },
    data: {
      status: PosQPayStatus.PAID,
      paidAt: new Date(),
      paymentId: String(
        (status as any)?.paymentId ||
          (status as any)?.raw?.paymentId ||
          invoice.id,
      ),
      webhookPayload: {
        ...payload,
        paidAmount: Number((status as any)?.paidAmount || invoice.amount || 0),
        lastPaymentCheck: status as unknown as Prisma.JsonObject,
      } as unknown as Prisma.JsonObject,
    },
  });
}

async function finalizeAssociationMembershipPayment(
  invoice: Awaited<ReturnType<typeof refreshAssociationInvoicePayment>>,
) {
  if (!invoice || invoice.status !== PosQPayStatus.PAID) return null;

  const payload = (
    invoice.webhookPayload && typeof invoice.webhookPayload === "object"
      ? invoice.webhookPayload
      : {}
  ) as Record<string, any>;
  if (String(payload.kind || "") !== "ASSOCIATION_MEMBERSHIP") return null;

  const userId = String(payload.userId || "").trim();
  const registrationId = String(payload.registrationId || "").trim();
  if (!userId || !registrationId) return null;

  const paidAt = invoice.paidAt || new Date();
  const registration = await prisma.associationMemberRegistration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
    },
  });
  if (!registration) return null;

  const updatedRegistration = await prisma.associationMemberRegistration.update({
    where: { id: registrationId },
    data: {
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: PaymentMethod.QPAY,
      paidAt,
      paymentReference: invoice.paymentId || invoice.id,
      paymentNote: "QPay/SystemQR төлбөр баталгаажсан. Admin баталгаажуулалт хүлээгдэж байна.",
      status:
        registration.status === ApprovalStatus.APPROVED
          ? ApprovalStatus.APPROVED
          : ApprovalStatus.PENDING,
    },
  });

  if (updatedRegistration.status === ApprovalStatus.APPROVED) {
    await prisma.$transaction((tx) =>
      syncApprovedAssociationMembership(tx, updatedRegistration),
    );
  }

  return { registration: updatedRegistration };
}

async function finalizeApprovedAssociationRegistrations(limit = 50) {
  const registrations = await prisma.associationMemberRegistration.findMany({
    where: {
      status: ApprovalStatus.APPROVED,
      paymentStatus: PaymentStatus.PAID,
    },
    orderBy: { reviewedAt: "desc" },
    take: limit,
  });

  for (const registration of registrations) {
    try {
      await prisma.$transaction((tx) =>
        syncApprovedAssociationMembership(tx, registration),
      );
    } catch (error) {
      console.error("Association membership sync error:", error);
    }
  }
}

async function reconcilePendingAssociationMembershipPayments(limit = 50) {
  const invoices = await prisma.qPayInvoice.findMany({
    where: {
      saleReference: { startsWith: "ASSOCIATION-" },
      status: {
        in: [
          PosQPayStatus.PENDING,
          PosQPayStatus.PAID,
          PosQPayStatus.EXPIRED,
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  for (const invoice of invoices) {
    try {
      const refreshed =
        invoice.status === PosQPayStatus.PAID
          ? invoice
          : await refreshAssociationInvoicePayment(invoice.id);
      await finalizeAssociationMembershipPayment(refreshed);
    } catch (error) {
      console.error("Association payment reconcile error:", error);
    }
  }

  await finalizeApprovedAssociationRegistrations(limit);
}

/* ── Public: submit registration ───────────────────────────── */
router.post("/association/register", async (req, res) => {
  try {
    const {
      lastName,
      firstName,
      education,
      profession,
      organizationName,
      businessActivity,
      foundedYear,
      address,
      experience,
      phone,
      membershipType,
      durationMonths,
      paymentReference,
    } = req.body;

    if (!lastName || !firstName || !phone || !membershipType) {
      return res
        .status(400)
        .json({ message: "Заавал бөглөх талбарууд дутуу байна" });
    }

    if (!isPaidMembershipType(membershipType)) {
      return res
        .status(400)
        .json({ message: "Гишүүнчлэлийн төрөл буруу байна" });
    }

    const duration = durationMonths ? Number(durationMonths) : null;
    if (![1, 6].includes(Number(duration))) {
      return res
        .status(400)
        .json({ message: "Гишүүнчлэлийн хугацаа 1 эсвэл 6 сар байна" });
    }
    const paymentAmount = await resolveMembershipPrice(
      membershipType,
      duration,
    );

    const registration = await prisma.associationMemberRegistration.create({
      data: {
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        education: education?.trim() || null,
        profession: profession?.trim() || null,
        organizationName: organizationName.trim(),
        businessActivity: businessActivity?.trim() || null,
        foundedYear: foundedYear?.trim() || null,
        address: optionalRegistrationAddress(address),
        experience: experience?.trim() || null,
        phone: phone.trim(),
        membershipType,
        durationMonths: duration,
        paymentAmount,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paymentReference: paymentReference?.trim() || null,
        paidAt: null,
        status: ApprovalStatus.PENDING,
      },
    });

    return res.status(201).json({ success: true, id: registration.id });
  } catch (e) {
    console.error("Association register error:", e);
    return res.status(500).json({ message: "Серверийн алдаа" });
  }
});

router.post("/association/systemqr", requireAuth, async (req, res) => {
  try {
    const userId = String((req as any).user?.userId || "").trim();
    const {
      lastName,
      firstName,
      education,
      profession,
      organizationName,
      businessActivity,
      foundedYear,
      address,
      experience,
      phone,
      membershipType,
      durationMonths,
      paymentReference,
    } = req.body;

    if (!userId)
      return res.status(401).json({ success: false, message: "Нэвтэрнэ үү" });
    if (!lastName || !firstName || !phone || !membershipType) {
      return res.status(400).json({
        success: false,
        message: "Заавал бөглөх талбарууд дутуу байна",
      });
    }
    if (!isPaidMembershipType(membershipType)) {
      return res
        .status(400)
        .json({ success: false, message: "Гишүүнчлэлийн төрөл буруу байна" });
    }

    const duration = durationMonths ? Number(durationMonths) : null;
    if (![1, 6].includes(Number(duration))) {
      return res.status(400).json({
        success: false,
        message: "Гишүүнчлэлийн хугацаа 1 эсвэл 6 сар байна",
      });
    }

    const amount = await resolveMembershipPrice(membershipType, duration);
    const resolvedOrganizationName =
      organizationName?.trim() ||
      [lastName, firstName].filter(Boolean).join(" ").trim() ||
      "Хувь хэрэглэгч";
    const config = await getAssociationConfig();
    const account = getAssociationPaymentAccount(config);
    if (!account.merchantCode || !account.password) {
      return res.status(400).json({
        success: false,
        message: getAssociationConfigMessage(
          config,
          "missingPaymentConfigMessage",
          "Алдаа гарлаа Admin тай холбогдоно уу.",
        ),
      });
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const result = await prisma.$transaction(async (tx) => {
      const registration = await tx.associationMemberRegistration.create({
        data: {
          lastName: lastName.trim(),
          firstName: firstName.trim(),
          education: education?.trim() || null,
          profession: profession?.trim() || null,
          organizationName: resolvedOrganizationName,
          businessActivity: businessActivity?.trim() || null,
          foundedYear: foundedYear?.trim() || null,
          address: optionalRegistrationAddress(address),
          experience: experience?.trim() || null,
          phone: phone.trim(),
          membershipType,
          durationMonths: duration,
          paymentAmount: amount,
          paymentStatus: PaymentStatus.PENDING,
          paymentMethod: PaymentMethod.QPAY,
          paymentReference: paymentReference?.trim() || null,
          paidAt: null,
          status: ApprovalStatus.PENDING,
        },
      });

      const invoice = await tx.qPayInvoice.create({
        data: {
          amount,
          qrText: "",
          status: PosQPayStatus.PENDING,
          expiresAt,
          saleReference: associationSaleReference(registration.id),
          webhookPayload: {
            kind: "ASSOCIATION_MEMBERSHIP",
            provider: "SYSTEMQR",
            userId,
            registrationId: registration.id,
            membershipType,
            durationMonths: duration,
            merchantCode: account.merchantCode,
            username: account.username,
            bankCode: account.bankCode,
            accountNumber: account.accountNumber,
            accountName: account.accountName,
          } as unknown as Prisma.JsonObject,
        },
      });

      return { registration, invoice };
    });

    try {
      const systemQr = await createSystemQrInvoice(
        {
          merchantCode: account.merchantCode,
          amount,
          referenceNumber: `ASM-${result.invoice.id.slice(0, 8).toUpperCase()}`,
          webhook: `${getApiRouteBaseUrl(req)}/association/systemqr/callback?invoiceId=${result.invoice.id}`,
        },
        account.username,
        account.password,
      );

      const updated = await prisma.qPayInvoice.update({
        where: { id: result.invoice.id },
        data: {
          qrText: systemQr.qrText,
          webhookPayload: {
            kind: "ASSOCIATION_MEMBERSHIP",
            provider: "SYSTEMQR",
            userId,
            registrationId: result.registration.id,
            membershipType,
            durationMonths: duration,
            merchantCode: account.merchantCode,
            username: account.username,
            bankCode: account.bankCode,
            accountNumber: account.accountNumber,
            accountName: account.accountName,
            providerInvoiceId: systemQr.invoiceId,
            systemQrInvoiceNumber: systemQr.invoiceId,
            deepLinks: systemQr.urls as unknown as Prisma.JsonArray,
          } as unknown as Prisma.JsonObject,
        },
      });

      return res.status(201).json({
        success: true,
        registrationId: result.registration.id,
        invoiceId: updated.id,
        providerInvoiceId: systemQr.invoiceId,
        amount,
        qrText: systemQr.qrText,
        qrImage: "",
        urls: systemQr.urls,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      await prisma.qPayInvoice
        .delete({ where: { id: result.invoice.id } })
        .catch(() => null);
      await prisma.associationMemberRegistration
        .delete({ where: { id: result.registration.id } })
        .catch(() => null);
      throw error;
    }
  } catch (e: any) {
    console.error("Association systemqr create error:", e);
    return res.status(500).json({
      success: false,
      message: e?.message || "QuickQR төлбөр үүсгэхэд алдаа гарлаа",
    });
  }
});

router.get("/association/systemqr/check", requireAuth, async (req, res) => {
  try {
    const userId = String((req as any).user?.userId || "").trim();
    const invoiceId =
      typeof req.query.invoiceId === "string" ? req.query.invoiceId : "";
    const registrationId =
      typeof req.query.registrationId === "string"
        ? req.query.registrationId
        : typeof req.query.projectId === "string"
          ? req.query.projectId
          : "";
    if (!invoiceId)
      return res
        .status(400)
        .json({ success: false, message: "invoiceId шаардлагатай" });

    const invoice = await refreshAssociationInvoicePayment(invoiceId);
    if (!invoice)
      return res
        .status(404)
        .json({ success: false, message: "Нэхэмжлэх олдсонгүй" });

    const payload = (
      invoice.webhookPayload && typeof invoice.webhookPayload === "object"
        ? invoice.webhookPayload
        : {}
    ) as Record<string, any>;
    const belongs =
      String(payload.kind || "") === "ASSOCIATION_MEMBERSHIP" &&
      String(payload.userId || "") === userId &&
      (!registrationId ||
        String(payload.registrationId || "") === registrationId);
    if (!belongs)
      return res.status(403).json({
        success: false,
        message: "Энэ нэхэмжлэх таны account-д хамаарахгүй байна",
      });

    const isPaid = invoice.status === PosQPayStatus.PAID;
    if (isPaid) {
      await finalizeAssociationMembershipPayment(invoice);
    }

    return res.json({
      success: true,
      isPaid,
      requiresAdminApproval: isPaid,
      status: invoice.status,
      expiresAt: invoice.expiresAt.toISOString(),
    });
  } catch (e) {
    console.error("Association systemqr check error:", e);
    return res
      .status(500)
      .json({ success: false, message: "Төлбөр шалгахад алдаа гарлаа" });
  }
});

router.all("/association/systemqr/callback", async (req, res) => {
  try {
    const invoiceId =
      typeof req.query.invoiceId === "string" ? req.query.invoiceId : "";
    if (invoiceId) {
      const invoice = await refreshAssociationInvoicePayment(invoiceId);
      await finalizeAssociationMembershipPayment(invoice);
    }
  } catch (error) {
    console.error("Association systemqr callback error:", error);
  }
  return res.json({ success: true });
});

/* ── Admin: list registrations ─────────────────────────────── */
router.get(
  "/admin/association/registrations",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_REGISTRATIONS),
  async (req, res) => {
    try {
      const {
        status,
        membershipType,
        paymentStatus,
        dateFrom,
        dateTo,
        sort = "newest",
        search,
        limit = "50",
        offset = "0",
      } = req.query;

      await reconcilePendingAssociationMembershipPayments(80);

      const where: any = {};
      if (
        status &&
        status !== "ALL" &&
        Object.values(ApprovalStatus).includes(status as ApprovalStatus)
      ) {
        where.status = status as ApprovalStatus;
      }
      if (
        membershipType &&
        membershipType !== "ALL" &&
        Object.values(AssociationMembershipType).includes(
          membershipType as AssociationMembershipType,
        )
      ) {
        where.membershipType = membershipType as AssociationMembershipType;
      }
      if (
        paymentStatus &&
        paymentStatus !== "ALL" &&
        Object.values(PaymentStatus).includes(paymentStatus as PaymentStatus)
      ) {
        where.paymentStatus = paymentStatus as PaymentStatus;
      }
      if (dateFrom || dateTo) {
        const createdAt: Prisma.DateTimeFilter = {};
        if (dateFrom) {
          const from = new Date(String(dateFrom));
          if (!Number.isNaN(from.getTime())) createdAt.gte = from;
        }
        if (dateTo) {
          const to = new Date(String(dateTo));
          if (!Number.isNaN(to.getTime())) {
            to.setHours(23, 59, 59, 999);
            createdAt.lte = to;
          }
        }
        if (Object.keys(createdAt).length > 0) where.createdAt = createdAt;
      }
      if (search) {
        const s = String(search);
        where.OR = [
          { firstName: { contains: s, mode: "insensitive" } },
          { lastName: { contains: s, mode: "insensitive" } },
          { organizationName: { contains: s, mode: "insensitive" } },
          { businessActivity: { contains: s, mode: "insensitive" } },
          { phone: { contains: s } },
        ];
      }

      const orderBy: Prisma.AssociationMemberRegistrationOrderByWithRelationInput[] =
        sort === "oldest"
          ? [{ createdAt: "asc" }]
          : sort === "amountDesc"
            ? [{ paymentAmount: "desc" }, { createdAt: "desc" }]
            : sort === "amountAsc"
              ? [{ paymentAmount: "asc" }, { createdAt: "desc" }]
              : [{ status: "asc" }, { createdAt: "desc" }];

      const [data, total] = await Promise.all([
        prisma.associationMemberRegistration.findMany({
          where,
          orderBy,
          take: Number(limit),
          skip: Number(offset),
        }),
        prisma.associationMemberRegistration.count({ where }),
      ]);

      return res.json({ data, total });
    } catch (e) {
      console.error("Association list error:", e);
      return res.status(500).json({ message: "Серверийн алдаа" });
    }
  },
);

/* ── Admin: get single ─────────────────────────────────────── */
router.get(
  "/admin/association/registrations/:id",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_REGISTRATIONS),
  async (req, res) => {
    try {
      const reg = await prisma.associationMemberRegistration.findUnique({
        where: { id: req.params.id },
      });
      if (!reg) return res.status(404).json({ message: "Олдсонгүй" });
      return res.json(reg);
    } catch (e) {
      return res.status(500).json({ message: "Серверийн алдаа" });
    }
  },
);

/* ── Admin: approve / reject ───────────────────────────────── */
router.patch(
  "/admin/association/registrations/:id",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_REGISTRATIONS),
  async (req, res) => {
    try {
      const {
        status,
        adminNote,
        paymentStatus,
        paymentAmount,
        paymentMethod,
        paymentReference,
        paymentNote,
        paidAt,
      } = req.body;
      const validStatuses = ["APPROVED", "REJECTED"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Төлөв буруу байна" });
      }

      const validPaymentStatuses = Object.values(PaymentStatus);
      if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
        return res.status(400).json({ message: "Төлбөрийн төлөв буруу байна" });
      }

      const validPaymentMethods = Object.values(PaymentMethod);
      if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
        return res
          .status(400)
          .json({ message: "Төлбөрийн хэлбэр буруу байна" });
      }

      const resolvedPaymentStatus = paymentStatus as PaymentStatus | undefined;

      const reg = await prisma.$transaction(async (tx) => {
        const updated = await tx.associationMemberRegistration.update({
          where: { id: req.params.id },
          data: {
            status: status as ApprovalStatus,
            adminNote: adminNote?.trim() || null,
            paymentStatus: resolvedPaymentStatus,
            paymentAmount:
              typeof paymentAmount === "number" &&
              Number.isFinite(paymentAmount)
                ? Math.max(0, Math.round(paymentAmount))
                : undefined,
            paymentMethod: paymentMethod || undefined,
            paymentReference: paymentReference?.trim() || null,
            paymentNote: paymentNote?.trim() || null,
            paidAt: paidAt
              ? new Date(paidAt)
              : resolvedPaymentStatus === PaymentStatus.PAID
                ? new Date()
                : undefined,
            reviewedAt: new Date(),
          },
        });

        await syncApprovedAssociationMembership(tx, updated);
        return updated;
      });

      return res.json(reg);
    } catch (e) {
      console.error("Association review error:", e);
      return res.status(500).json({ message: "Серверийн алдаа" });
    }
  },
);

/* ── Admin: stats summary ──────────────────────────────────── */
router.get(
  "/admin/association/stats",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_REGISTRATIONS),
  async (_req, res) => {
    try {
      await reconcilePendingAssociationMembershipPayments(80);

      const [total, pending, approved, byType] = await Promise.all([
        prisma.associationMemberRegistration.count(),
        prisma.associationMemberRegistration.count({
          where: { status: "PENDING" },
        }),
        prisma.associationMemberRegistration.count({
          where: { status: "APPROVED" },
        }),
        prisma.associationMemberRegistration.groupBy({
          by: ["membershipType"],
          _count: { id: true },
        }),
      ]);

      return res.json({ total, pending, approved, byType });
    } catch (e) {
      return res.status(500).json({ message: "Серверийн алдаа" });
    }
  },
);

/* ── Public: get association config (prices, labels, etc.) ─ */
router.get("/association/config", async (_req, res) => {
  try {
    const config = await getAssociationConfig();
    if (!config) return res.json(null); // fallback to hardcoded
    return res.json(publicAssociationConfig(config));
  } catch (e) {
    console.error("Association config get error:", e);
    return res.status(500).json({ message: "Серверийн алдаа" });
  }
});

router.get(
  "/admin/association/config",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_REGISTRATIONS),
  async (_req, res) => {
    try {
      const config = await getAssociationConfig();
      return res.json(config);
    } catch (e) {
      console.error("Association admin config get error:", e);
      return res.status(500).json({ message: "Серверийн алдаа" });
    }
  },
);

/* ── Admin: update association config ───────────────────── */
router.put(
  "/admin/association/config",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_REGISTRATIONS),
  async (req, res) => {
    try {
      const config = req.body;
      if (!config || typeof config !== "object") {
        return res.status(400).json({ message: "Config буруу байна" });
      }
      await prisma.siteSetting.upsert({
        where: { key: "association_config" },
        create: { key: "association_config", value: JSON.stringify(config) },
        update: { value: JSON.stringify(config) },
      });
      return res.json({ success: true });
    } catch (e) {
      console.error("Association config update error:", e);
      return res.status(500).json({ message: "Серверийн алдаа" });
    }
  },
);

export default router;
