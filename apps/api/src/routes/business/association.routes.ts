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

const DEFAULT_AGENT_COMMISSION_RATE = 10;
const REFERRAL_COMMISSION_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
} as const;
type ReferralCommissionStatusValue =
  (typeof REFERRAL_COMMISSION_STATUS)[keyof typeof REFERRAL_COMMISSION_STATUS];

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

function normalizeAgentCode(value?: string | null) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
}

function normalizeAgentPhone(value?: string | null) {
  return normalizePhone(value);
}

function clampCommissionRate(value: unknown) {
  const rate = Number(value);
  if (!Number.isFinite(rate)) return DEFAULT_AGENT_COMMISSION_RATE;
  return Math.min(100, Math.max(0, Math.round(rate * 100) / 100));
}

function getDefaultAgentCommissionRate(config: unknown) {
  if (!config || typeof config !== "object")
    return DEFAULT_AGENT_COMMISSION_RATE;
  const raw = (config as Record<string, unknown>).defaultAgentCommissionRate;
  return clampCommissionRate(raw);
}

function generateAgentCode(fullName: string, phone: string) {
  const namePart =
    fullName
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 4)
      .toUpperCase() || "AG";
  const phonePart =
    normalizeAgentPhone(phone).slice(-4) ||
    Math.floor(1000 + Math.random() * 9000).toString();
  return normalizeAgentCode(`${namePart}${phonePart}`);
}

async function createUniqueAgentCode(fullName: string, phone: string) {
  const base = generateAgentCode(fullName, phone);
  for (let index = 0; index < 20; index += 1) {
    const suffix = index === 0 ? "" : String(index + 1);
    const code = normalizeAgentCode(`${base}${suffix}`);
    const existing = await prisma.membershipAgent.findUnique({
      where: { code },
    });
    if (!existing) return code;
  }
  return normalizeAgentCode(`${base}${Date.now().toString().slice(-5)}`);
}

async function resolveActiveAgent(agentCode?: string | null) {
  const code = normalizeAgentCode(agentCode);
  if (!code) return null;
  return prisma.membershipAgent.findFirst({
    where: { code, isActive: true },
    select: {
      id: true,
      code: true,
      commissionRate: true,
      userId: true,
      fullName: true,
    },
  });
}

function calculateCommissionAmount(
  paymentAmount: number,
  commissionRate: unknown,
) {
  const rate = clampCommissionRate(commissionRate);
  return Math.round((Math.max(0, paymentAmount) * rate) / 100);
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

function associationPaymentReference(phone: string) {
  return normalizePhone(phone) || phone.trim();
}

function getPayloadUserId(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined;
  const userId = String(
    (payload as Record<string, unknown>).userId || "",
  ).trim();
  return userId || undefined;
}

async function findAssociationInvoiceUserId(
  tx: PrismaLike,
  registrationId: string,
) {
  const invoice = await tx.qPayInvoice.findFirst({
    where: { saleReference: associationSaleReference(registrationId) },
    orderBy: { createdAt: "desc" },
    select: { webhookPayload: true },
  });

  return getPayloadUserId(invoice?.webhookPayload);
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

async function findUserByAssociationUserId(tx: PrismaLike, userId?: string) {
  const id = String(userId || "").trim();
  if (!id) return null;

  return tx.user.findFirst({
    where: {
      id,
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      membershipExpiresAt: true,
      membershipDiscountPhone: true,
      profile: { select: { phoneNumber: true } },
    },
  });
}

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
  options: { userId?: string } = {},
) {
  if (
    registration.status !== ApprovalStatus.APPROVED ||
    registration.paymentStatus !== PaymentStatus.PAID
  ) {
    return null;
  }

  const user =
    (await findUserByAssociationUserId(tx, options.userId)) ||
    (await findUserByAssociationPhone(tx, registration.phone));
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
  ) as Record<string, unknown>;
  if (String(payload.kind || "") !== "ASSOCIATION_MEMBERSHIP") return null;

  const userId = String(payload.userId || "").trim();
  const registrationId = String(payload.registrationId || "").trim();
  if (!userId || !registrationId) return null;

  const paidAt = invoice.paidAt || new Date();
  const registration = await prisma.associationMemberRegistration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      agentId: true,
      agentCode: true,
      agentCommissionRate: true,
      paymentAmount: true,
    },
  });
  if (!registration) return null;

  const updatedRegistration = await prisma.$transaction(async (tx) => {
    const updated = await tx.associationMemberRegistration.update({
      where: { id: registrationId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: PaymentMethod.QPAY,
        paidAt,
        paymentReference: invoice.paymentId || invoice.id,
        paymentNote:
          "QPay/SystemQR төлбөр баталгаажсан. Гишүүнчлэл автоматаар идэвхжив.",
        status: ApprovalStatus.APPROVED,
        reviewedAt: new Date(),
      },
    });

    await syncApprovedAssociationMembership(tx, updated, { userId });

    if (registration.agentId && updated.paymentAmount > 0) {
      const commissionRate = registration.agentCommissionRate ?? 0;
      const commissionAmount = calculateCommissionAmount(
        updated.paymentAmount,
        commissionRate,
      );
      await tx.membershipReferralCommission.upsert({
        where: { registrationId },
        create: {
          agentId: registration.agentId,
          agentUserId: String(payload.agentUserId || "").trim() || null,
          registrationId,
          paymentAmount: updated.paymentAmount,
          commissionRate,
          commissionAmount,
          status: REFERRAL_COMMISSION_STATUS.PENDING,
        },
        update: {
          paymentAmount: updated.paymentAmount,
          commissionRate,
          commissionAmount,
        },
      });
      await tx.associationMemberRegistration.update({
        where: { id: registrationId },
        data: {
          agentCommissionAmount: commissionAmount,
          agentCommissionStatus: REFERRAL_COMMISSION_STATUS.PENDING,
        },
      });
    }

    return updated;
  });

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
      const userId = await findAssociationInvoiceUserId(
        prisma,
        registration.id,
      );

      await prisma.$transaction((tx) =>
        syncApprovedAssociationMembership(tx, registration, { userId }),
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
        in: [PosQPayStatus.PENDING, PosQPayStatus.PAID, PosQPayStatus.EXPIRED],
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

const ASSOCIATION_RECONCILE_COOLDOWN_MS = 30_000;
let associationReconcileInFlight: Promise<void> | null = null;
let associationReconcileLastStartedAt = 0;

function triggerAssociationPaymentReconciliation(limit = 30) {
  const now = Date.now();
  if (
    associationReconcileInFlight ||
    now - associationReconcileLastStartedAt < ASSOCIATION_RECONCILE_COOLDOWN_MS
  ) {
    return;
  }

  associationReconcileLastStartedAt = now;
  associationReconcileInFlight = reconcilePendingAssociationMembershipPayments(
    limit,
  )
    .catch((error) => {
      console.error("Association background payment reconcile error:", error);
    })
    .finally(() => {
      associationReconcileInFlight = null;
    });
}

/* ── Public: submit registration ───────────────────────────── */
router.post("/association/register", async (req, res) => {
  return res.status(410).json({
    success: false,
    message:
      "Гишүүнчлэлийн хүсэлт зөвхөн төлбөр баталгаажсаны дараа бүртгэгдэнэ. QPay төлбөрөөр үргэлжлүүлнэ үү.",
  });
});

router.post("/association/agents", async (req, res) => {
  try {
    const fullName = String(req.body?.fullName || "").trim();
    const phone = normalizeAgentPhone(req.body?.phone);
    const email =
      String(req.body?.email || "")
        .trim()
        .toLowerCase() || null;
    const requestedCode = normalizeAgentCode(req.body?.code);

    if (!fullName || !phone) {
      return res.status(400).json({
        success: false,
        message: "Нэр болон утас шаардлагатай",
      });
    }

    const config = await getAssociationConfig();
    const commissionRate = getDefaultAgentCommissionRate(config);
    const code =
      requestedCode || (await createUniqueAgentCode(fullName, phone));

    const existingAgent = await prisma.membershipAgent.findFirst({
      where: {
        isActive: true,
        OR: [{ phone }, ...(email ? [{ email }] : [])],
      },
      select: {
        id: true,
        code: true,
        fullName: true,
        phone: true,
        email: true,
        commissionRate: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingAgent) {
      return res.json({ success: true, agent: existingAgent });
    }

    const agent = await prisma.membershipAgent.create({
      data: {
        code,
        fullName,
        phone,
        email,
        commissionRate,
      },
      select: {
        id: true,
        code: true,
        fullName: true,
        phone: true,
        email: true,
        commissionRate: true,
      },
    });

    return res.status(201).json({ success: true, agent });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Энэ agent code аль хэдийн ашиглагдаж байна",
      });
    }
    console.error("Association agent create error:", error);
    return res.status(500).json({
      success: false,
      message: "Agent code үүсгэхэд алдаа гарлаа",
    });
  }
});

router.get("/association/agents/lookup", async (req, res) => {
  try {
    const query = String(req.query.query || "").trim();
    const phone = normalizeAgentPhone(query);
    const email = query.toLowerCase();
    const code = normalizeAgentCode(query);

    if (!query || query.length < 4) {
      return res.status(400).json({
        success: false,
        message: "Утас, имэйл эсвэл agent code оруулна уу",
      });
    }

    const where: Prisma.MembershipAgentWhereInput = {
      isActive: true,
      OR: [
        ...(phone ? [{ phone }] : []),
        ...(email.includes("@") ? [{ email }] : []),
        ...(code ? [{ code }] : []),
      ],
    };

    if (!where.OR || where.OR.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Зөв утас, имэйл эсвэл agent code оруулна уу",
      });
    }

    const agent = await prisma.membershipAgent.findFirst({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        code: true,
        fullName: true,
        commissionRate: true,
      },
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Ийм мэдээлэлтэй идэвхтэй agent олдсонгүй",
      });
    }

    return res.json({ success: true, agent });
  } catch (error) {
    console.error("Association agent lookup error:", error);
    return res.status(500).json({ success: false, message: "Серверийн алдаа" });
  }
});

router.get("/association/agents/:code", async (req, res) => {
  try {
    const code = normalizeAgentCode(req.params.code);
    if (!code) {
      return res
        .status(400)
        .json({ success: false, message: "Code шаардлагатай" });
    }

    const agent = await prisma.membershipAgent.findFirst({
      where: { code, isActive: true },
      select: {
        code: true,
        fullName: true,
        commissionRate: true,
      },
    });
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent code олдсонгүй",
      });
    }

    return res.json({ success: true, agent });
  } catch (error) {
    console.error("Association agent lookup error:", error);
    return res.status(500).json({ success: false, message: "Серверийн алдаа" });
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
      agentCode,
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
    const agent = await resolveActiveAgent(agentCode);
    if (agentCode && !agent) {
      return res.status(400).json({
        success: false,
        message: "Agent code буруу эсвэл идэвхгүй байна",
      });
    }
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
    const qpayReference = associationPaymentReference(phone);
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
          paymentReference: paymentReference?.trim() || qpayReference || null,
          paidAt: null,
          agentId: agent?.id || null,
          agentCode: agent?.code || null,
          agentCommissionRate: agent?.commissionRate || null,
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
            agentId: agent?.id || null,
            agentCode: agent?.code || null,
            agentUserId: agent?.userId || null,
            agentCommissionRate: agent?.commissionRate || null,
            merchantCode: account.merchantCode,
            username: account.username,
            bankCode: account.bankCode,
            accountNumber: account.accountNumber,
            accountName: account.accountName,
            paymentReference: qpayReference,
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
          referenceNumber:
            qpayReference ||
            `ASM-${result.invoice.id.slice(0, 8).toUpperCase()}`,
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
            agentId: agent?.id || null,
            agentCode: agent?.code || null,
            agentUserId: agent?.userId || null,
            agentCommissionRate: agent?.commissionRate || null,
            merchantCode: account.merchantCode,
            username: account.username,
            bankCode: account.bankCode,
            accountNumber: account.accountNumber,
            accountName: account.accountName,
            paymentReference: qpayReference,
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
      requiresAdminApproval: false,
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
        agentCode,
        limit = "50",
        offset = "0",
      } = req.query;

      triggerAssociationPaymentReconciliation();

      if (
        paymentStatus &&
        paymentStatus !== "ALL" &&
        paymentStatus !== PaymentStatus.PAID
      ) {
        return res.json({ data: [], total: 0 });
      }

      const where: Prisma.AssociationMemberRegistrationWhereInput = {
        paymentStatus: PaymentStatus.PAID,
      };
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
          {
            agentCode: { contains: normalizeAgentCode(s), mode: "insensitive" },
          },
        ];
      }
      const normalizedAgentCode = normalizeAgentCode(
        typeof agentCode === "string" ? agentCode : "",
      );
      if (normalizedAgentCode) {
        where.agentCode = {
          contains: normalizedAgentCode,
          mode: "insensitive",
        };
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
          include: {
            agent: {
              select: {
                id: true,
                code: true,
                fullName: true,
                commissionRate: true,
              },
            },
            referralCommission: {
              select: {
                id: true,
                commissionAmount: true,
                commissionRate: true,
                status: true,
                paidAt: true,
              },
            },
          },
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

        const userId = await findAssociationInvoiceUserId(tx, updated.id);

        await syncApprovedAssociationMembership(tx, updated, { userId });
        return updated;
      });

      return res.json(reg);
    } catch (e) {
      console.error("Association review error:", e);
      return res.status(500).json({ message: "Серверийн алдаа" });
    }
  },
);

router.get(
  "/admin/association/agents",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_REGISTRATIONS),
  async (_req, res) => {
    try {
      const agents = await prisma.membershipAgent.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          code: true,
          fullName: true,
          phone: true,
          email: true,
          commissionRate: true,
          isActive: true,
          createdAt: true,
        },
      });
      const agentIds = agents.map((agent) => agent.id);
      const [registrationCounts, commissionTotals] =
        agentIds.length === 0
          ? [[], []]
          : await Promise.all([
              prisma.associationMemberRegistration.groupBy({
                by: ["agentId"],
                where: { agentId: { in: agentIds } },
                _count: { id: true },
              }),
              prisma.membershipReferralCommission.groupBy({
                by: ["agentId", "status"],
                where: { agentId: { in: agentIds } },
                _count: { id: true },
                _sum: {
                  commissionAmount: true,
                  paymentAmount: true,
                },
              }),
            ]);

      const registrationsByAgent = new Map(
        registrationCounts
          .filter((item) => item.agentId)
          .map((item) => [item.agentId as string, item._count.id]),
      );
      const totalsByAgent = new Map<
        string,
        {
          paidMemberCount: number;
          revenue: number;
          pendingCommission: number;
          paidCommission: number;
        }
      >();

      for (const total of commissionTotals) {
        const current = totalsByAgent.get(total.agentId) ?? {
          paidMemberCount: 0,
          revenue: 0,
          pendingCommission: 0,
          paidCommission: 0,
        };
        const commissionAmount = total._sum.commissionAmount ?? 0;

        current.paidMemberCount += total._count.id;
        current.revenue += total._sum.paymentAmount ?? 0;
        if (total.status === REFERRAL_COMMISSION_STATUS.PAID) {
          current.paidCommission += commissionAmount;
        } else {
          current.pendingCommission += commissionAmount;
        }
        totalsByAgent.set(total.agentId, current);
      }

      return res.json({
        data: agents.map((agent) => {
          const totals = totalsByAgent.get(agent.id) ?? {
            paidMemberCount: 0,
            revenue: 0,
            pendingCommission: 0,
            paidCommission: 0,
          };

          return {
            id: agent.id,
            code: agent.code,
            fullName: agent.fullName,
            phone: agent.phone,
            email: agent.email,
            commissionRate: Number(agent.commissionRate),
            isActive: agent.isActive,
            createdAt: agent.createdAt,
            registrationCount: registrationsByAgent.get(agent.id) ?? 0,
            paidMemberCount: totals.paidMemberCount,
            revenue: totals.revenue,
            pendingCommission: totals.pendingCommission,
            paidCommission: totals.paidCommission,
          };
        }),
      });
    } catch (error) {
      console.error("Association agents list error:", error);
      return res
        .status(500)
        .json({ message: "Agent жагсаалт авахад алдаа гарлаа" });
    }
  },
);

router.patch(
  "/admin/association/agents/:id",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_REGISTRATIONS),
  async (req, res) => {
    try {
      const data: Prisma.MembershipAgentUpdateInput = {};
      if (req.body?.commissionRate !== undefined) {
        data.commissionRate = clampCommissionRate(req.body.commissionRate);
      }
      if (typeof req.body?.isActive === "boolean") {
        data.isActive = req.body.isActive;
      }
      if (typeof req.body?.fullName === "string") {
        data.fullName = req.body.fullName.trim();
      }
      if (typeof req.body?.phone === "string") {
        data.phone = normalizeAgentPhone(req.body.phone);
      }
      if (typeof req.body?.email === "string") {
        data.email = req.body.email.trim().toLowerCase() || null;
      }

      const agent = await prisma.membershipAgent.update({
        where: { id: req.params.id },
        data,
      });

      return res.json({ success: true, agent });
    } catch (error) {
      console.error("Association agent update error:", error);
      return res.status(500).json({ message: "Agent шинэчлэхэд алдаа гарлаа" });
    }
  },
);

router.patch(
  "/admin/association/commissions/:id",
  requireAuth,
  requirePlatformPermission(Permission.MANAGE_REGISTRATIONS),
  async (req, res) => {
    try {
      const status = String(req.body?.status || "");
      if (
        !Object.values(REFERRAL_COMMISSION_STATUS).includes(
          status as ReferralCommissionStatusValue,
        )
      ) {
        return res
          .status(400)
          .json({ message: "Commission төлөв буруу байна" });
      }

      const commission = await prisma.membershipReferralCommission.update({
        where: { id: req.params.id },
        data: {
          status: status as ReferralCommissionStatusValue,
          paidAt:
            status === REFERRAL_COMMISSION_STATUS.PAID ? new Date() : null,
          note:
            typeof req.body?.note === "string"
              ? req.body.note.trim() || null
              : undefined,
        },
      });

      await prisma.associationMemberRegistration.update({
        where: { id: commission.registrationId },
        data: {
          agentCommissionStatus: commission.status,
          agentCommissionAmount: commission.commissionAmount,
        },
      });

      return res.json({ success: true, commission });
    } catch (error) {
      console.error("Association commission update error:", error);
      return res
        .status(500)
        .json({ message: "Commission шинэчлэхэд алдаа гарлаа" });
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
      triggerAssociationPaymentReconciliation();

      const paidOnlyWhere = { paymentStatus: PaymentStatus.PAID } as const;
      const [total, pending, approved, byType] = await Promise.all([
        prisma.associationMemberRegistration.count({
          where: paidOnlyWhere,
        }),
        prisma.associationMemberRegistration.count({
          where: { ...paidOnlyWhere, status: "PENDING" },
        }),
        prisma.associationMemberRegistration.count({
          where: { ...paidOnlyWhere, status: "APPROVED" },
        }),
        prisma.associationMemberRegistration.groupBy({
          by: ["membershipType"],
          where: paidOnlyWhere,
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
