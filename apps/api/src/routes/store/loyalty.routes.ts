import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import type { Prisma } from "@mgl/database";
import { requireAuth } from "../../middleware/auth";

const router: ExpressRouter = Router();
const FRANCHISE_ITEMS_KEY = "paid-projects";
const SITE_PROJECTS_KEY = "site-projects";
const SITE_STUDY_KEY = "site-study";

type PaidAccessSourceType = "PROJECT" | "FRANCHISE" | "SERVICE" | "POS_SALE";

type PosLoyaltyRedemptionStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CONSUMED"
  | "EXPIRED"
  | "CANCELLED";

const POS_LOYALTY_REDEMPTION_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CONSUMED: "CONSUMED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;

type PaidAccessProject = {
  id?: string;
  title?: string;
  pdfUrl?: string;
};

type CustomerTransaction = {
  id: string;
  type: "ACCESS_PURCHASE" | "ORDER" | "ORDER_PAYMENT";
  title: string;
  description: string;
  amount: number;
  status: string;
  method: string | null;
  reference: string | null;
  sourceType: string;
  occurredAt: string;
};

type CustomerRedeemSession = {
  id: string;
  token: string;
  organizationId: string;
  branchId: string;
  customerPhone: string;
  requestedPoints: number;
  saleTotal: unknown;
  status: PosLoyaltyRedemptionStatus;
  expiresAt: Date;
  confirmedAt: Date | null;
};

type PosLoyaltyRedeemSessionClient = Pick<
  Prisma.TransactionClient,
  "$queryRaw" | "$executeRaw"
>;

function normalizePhone(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function mapCustomerRedeemSession(
  session: CustomerRedeemSession,
  balance: number,
) {
  return {
    id: session.id,
    token: session.token,
    organizationId: session.organizationId,
    branchId: session.branchId,
    phone: session.customerPhone,
    requestedPoints: session.requestedPoints,
    saleTotal: Number(session.saleTotal),
    status: session.status,
    balance,
    expiresAt: session.expiresAt.toISOString(),
    confirmedAt: session.confirmedAt?.toISOString() ?? null,
  };
}

async function selectRedeemSessionByToken(
  tx: PosLoyaltyRedeemSessionClient,
  token: string,
) {
  const rows = await tx.$queryRaw<(CustomerRedeemSession & { userId: string })[]>`
    SELECT
      "id",
      "token",
      "organizationId",
      "branchId",
      "userId",
      "customerPhone",
      "requestedPoints",
      "saleTotal",
      "status",
      "expiresAt",
      "confirmedAt"
    FROM "PosLoyaltyRedemptionSession"
    WHERE "token" = ${token}
    LIMIT 1
  `;
  return rows[0] || null;
}

async function updateRedeemSessionStatus(
  tx: PosLoyaltyRedeemSessionClient,
  input: {
    id: string;
    status: PosLoyaltyRedemptionStatus;
    expectedStatus?: PosLoyaltyRedemptionStatus;
    confirmedAt?: Date;
  },
) {
  return tx.$executeRaw`
    UPDATE "PosLoyaltyRedemptionSession"
    SET
      "status" = CAST(${input.status} AS "PosLoyaltyRedemptionStatus"),
      "confirmedAt" = COALESCE(${input.confirmedAt ?? null}, "confirmedAt"),
      "updatedAt" = ${new Date()}
    WHERE "id" = ${input.id}
      AND (
        CAST(${input.expectedStatus ?? null} AS "PosLoyaltyRedemptionStatus") IS NULL
        OR "status" = CAST(${input.expectedStatus ?? null} AS "PosLoyaltyRedemptionStatus")
      )
  `;
}

function isMembershipActive(user: {
  isPrime: boolean;
  membershipExpiresAt?: Date | null;
}) {
  return Boolean(
    user.isPrime &&
    (!user.membershipExpiresAt ||
      user.membershipExpiresAt.getTime() > Date.now()),
  );
}

function parseProjectItems(value?: string | null): PaidAccessProject[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function paidAccessFileName(title?: string | null) {
  const cleanTitle = String(title || "MGL файл")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${cleanTitle || "MGL файл"}.pdf`;
}

async function getCurrentPaidAccessFiles() {
  const settings = await prisma.siteSetting.findMany({
    where: {
      key: { in: [SITE_PROJECTS_KEY, SITE_STUDY_KEY, FRANCHISE_ITEMS_KEY] },
    },
    select: { key: true, value: true },
  });

  const lookup = new Map<
    string,
    { fileUrl: string | null; fileName: string | null; title: string | null }
  >();

  for (const setting of settings) {
    const sourceType: PaidAccessSourceType =
      setting.key === FRANCHISE_ITEMS_KEY ? "FRANCHISE" : "PROJECT";
    for (const item of parseProjectItems(setting.value)) {
      const itemId = String(item.id || "").trim();
      if (!itemId) continue;
      const fileUrl = String(item.pdfUrl || "").trim() || null;
      const title = String(item.title || "").trim() || null;
      lookup.set(`${sourceType}:${itemId}`, {
        fileUrl,
        fileName: fileUrl ? paidAccessFileName(title) : null,
        title,
      });
    }
  }

  return lookup;
}

// ── GET /customer/membership/phone-discount?phone=9911xxxx
// Without a phone query this returns the authenticated member's saved discount phone.
// With a phone query POS/checkout flows can check whether that phone can receive member discount.
router.get(
  "/customer/membership/phone-discount",
  requireAuth,
  async (req, res) => {
    try {
      const userId = (req as any).user.userId as string;
      const phone = normalizePhone(req.query.phone);

      if (!phone) {
        const currentUser = await prisma.user.findFirst({
          where: {
            id: userId,
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
            isPrime: true,
            membershipDiscountPhone: true,
            membershipStartedAt: true,
            membershipExpiresAt: true,
            profile: { select: { phoneNumber: true } },
          },
        });
        const eligible = Boolean(
          currentUser && isMembershipActive(currentUser),
        );
        const discountPhone =
          currentUser?.membershipDiscountPhone ||
          currentUser?.profile?.phoneNumber ||
          null;

        return res.json({
          eligible: Boolean(eligible && discountPhone),
          badge: eligible ? "MEMBER" : "NONE",
          phone: eligible ? discountPhone : null,
          startedAt: eligible ? currentUser?.membershipStartedAt || null : null,
          expiresAt: eligible ? currentUser?.membershipExpiresAt || null : null,
        });
      }

      if (phone.length < 6) {
        return res.status(400).json({ message: "Утасны дугаар буруу байна" });
      }

      const user = await prisma.user.findFirst({
        where: {
          isActive: true,
          deletedAt: null,
          OR: [
            { membershipDiscountPhone: phone },
            { membershipDiscountPhone: null, profile: { phoneNumber: phone } },
          ],
        },
        select: {
          id: true,
          isPrime: true,
          membershipDiscountPhone: true,
          membershipStartedAt: true,
          membershipExpiresAt: true,
          profile: { select: { phoneNumber: true } },
        },
      });

      const eligible = Boolean(user && isMembershipActive(user));

      return res.json({
        eligible,
        badge: eligible ? "MEMBER" : "NONE",
        phone,
        startedAt: eligible ? user?.membershipStartedAt || null : null,
        expiresAt: eligible ? user?.membershipExpiresAt || null : null,
      });
    } catch (error) {
      console.error("GET /customer/membership/phone-discount error", error);
      return res
        .status(500)
        .json({ message: "Membership хөнгөлөлт шалгахад алдаа гарлаа" });
    }
  },
);

// ── GET /customer/purchases — paid project/franchise files owned by account
router.get("/customer/purchases", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const [purchases, currentFiles] = await Promise.all([
      prisma.paidAccessPurchase.findMany({
        where: { userId },
        orderBy: { purchasedAt: "desc" },
        take: 100,
      }),
      getCurrentPaidAccessFiles(),
    ]);

    res.json({
      purchases: purchases.map((purchase) => {
        const current = currentFiles.get(
          `${purchase.sourceType}:${purchase.itemId}`,
        );
        const fileUrl = current?.fileUrl || purchase.fileUrl;
        return {
          id: purchase.id,
          sourceType: purchase.sourceType,
          itemId: purchase.itemId,
          title: current?.title || purchase.title,
          fileUrl,
          fileName:
            current?.fileName ||
            purchase.fileName ||
            (fileUrl
              ? paidAccessFileName(current?.title || purchase.title)
              : null),
          amount: purchase.amount,
          invoiceId: purchase.invoiceId,
          purchasedAt: purchase.purchasedAt,
        };
      }),
    });
  } catch (error) {
    console.error("GET /customer/purchases error", error);
    res
      .status(500)
      .json({ message: "Худалдан авсан файлууд авахад алдаа гарлаа" });
  }
});

// ── GET /customer/transactions — clear payment / transaction history
router.get("/customer/transactions", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const [purchases, orders] = await Promise.all([
      prisma.paidAccessPurchase.findMany({
        where: { userId },
        orderBy: { purchasedAt: "desc" },
        take: 100,
      }),
      prisma.order.findMany({
        where: { customerId: userId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          orderNumber: true,
          total: true,
          paymentStatus: true,
          paymentMethod: true,
          createdAt: true,
          organization: { select: { name: true } },
          items: {
            select: {
              quantity: true,
              productName: true,
            },
          },
          payments: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              method: true,
              status: true,
              amount: true,
              providerRef: true,
              paidAt: true,
              refundedAt: true,
              cancelledAt: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    const accessTransactions: CustomerTransaction[] = purchases.map(
      (purchase) => ({
        id: `access-${purchase.id}`,
        type: "ACCESS_PURCHASE",
        title: purchase.title,
        description:
          purchase.sourceType === "FRANCHISE"
            ? "Franchise access худалдан авалт"
            : purchase.sourceType === "SERVICE"
              ? "Үйлчилгээний access худалдан авалт"
              : "Төслийн материал худалдан авалт",
        amount: purchase.amount,
        status: "PAID",
        method: "ONLINE",
        reference: purchase.invoiceId,
        sourceType: purchase.sourceType,
        occurredAt: purchase.purchasedAt.toISOString(),
      }),
    );

    const orderTransactions = orders.flatMap((order): CustomerTransaction[] => {
      if (order.payments.length === 0) {
        return [
          {
            id: `order-${order.id}`,
            type: "ORDER",
            title: `Захиалга ${order.orderNumber}`,
            description: `${order.organization.name} · ${order.items.reduce(
              (sum, item) => sum + item.quantity,
              0,
            )} бараа`,
            amount: Number(order.total),
            status: order.paymentStatus,
            method: order.paymentMethod || null,
            reference: null,
            sourceType: "ORDER",
            occurredAt: order.createdAt.toISOString(),
          },
        ];
      }

      return order.payments.map((payment) => ({
        id: `payment-${payment.id}`,
        type: "ORDER_PAYMENT",
        title: `Захиалга ${order.orderNumber}`,
        description: `${order.organization.name} · ${order.items
          .slice(0, 2)
          .map((item) => item.productName)
          .join(", ")}`,
        amount: Number(payment.amount),
        status: payment.status,
        method: payment.method,
        reference: payment.providerRef,
        sourceType: "ORDER",
        occurredAt: (
          payment.paidAt ||
          payment.refundedAt ||
          payment.cancelledAt ||
          payment.createdAt
        ).toISOString(),
      }));
    });

    const transactions = [...accessTransactions, ...orderTransactions]
      .sort(
        (left, right) =>
          new Date(right.occurredAt).getTime() -
          new Date(left.occurredAt).getTime(),
      )
      .slice(0, 150);

    res.json({ transactions });
  } catch (error) {
    console.error("GET /customer/transactions error", error);
    res.status(500).json({ message: "Гүйлгээний түүх авахад алдаа гарлаа" });
  }
});

// ── GET /customer/loyalty/points — current points balance
router.get(
  "/customer/loyalty/redeem-sessions/:token",
  requireAuth,
  async (req, res) => {
    try {
      const userId = (req as any).user.userId as string;
      const token = String(req.params.token || "").trim();
      if (!token) {
        return res.status(400).json({ message: "QR token шаардлагатай" });
      }

      const session = await selectRedeemSessionByToken(prisma, token);
      if (!session) {
        return res.status(404).json({ message: "M Point QR олдсонгүй" });
      }
      if (session.userId !== userId) {
        return res.status(403).json({ message: "Энэ QR таны бүртгэлтэй таарахгүй байна" });
      }

      let effectiveSession = session;
      if (
        session.status === POS_LOYALTY_REDEMPTION_STATUS.PENDING &&
        session.expiresAt.getTime() <= Date.now()
      ) {
        await updateRedeemSessionStatus(prisma, {
          id: session.id,
          status: POS_LOYALTY_REDEMPTION_STATUS.EXPIRED,
          expectedStatus: POS_LOYALTY_REDEMPTION_STATUS.PENDING,
        });
        effectiveSession = {
          ...session,
          status: POS_LOYALTY_REDEMPTION_STATUS.EXPIRED,
        };
      }

      const balance = await prisma.mPointLedger.aggregate({
        where: { userId },
        _sum: { amount: true },
      });

      return res.json(
        mapCustomerRedeemSession(
          effectiveSession,
          Number(balance._sum.amount || 0),
        ),
      );
    } catch (error) {
      console.error("GET /customer/loyalty/redeem-sessions/:token error", error);
      return res.status(500).json({ message: "M Point QR мэдээлэл авахад алдаа гарлаа" });
    }
  },
);

router.post(
  "/customer/loyalty/redeem-sessions/:token/confirm",
  requireAuth,
  async (req, res) => {
    try {
      const userId = (req as any).user.userId as string;
      const token = String(req.params.token || "").trim();
      if (!token) {
        return res.status(400).json({ message: "QR token шаардлагатай" });
      }

      const result = await prisma.$transaction(async (tx) => {
        const session = await selectRedeemSessionByToken(tx, token);
        if (!session) {
          return { status: 404, body: { message: "M Point QR олдсонгүй" } };
        }
        if (session.userId !== userId) {
          return {
            status: 403,
            body: { message: "Энэ QR таны бүртгэлтэй таарахгүй байна" },
          };
        }
        if (session.status === POS_LOYALTY_REDEMPTION_STATUS.CONFIRMED) {
          const balance = await tx.mPointLedger.aggregate({
            where: { userId },
            _sum: { amount: true },
          });
          return {
            status: 200,
            body: mapCustomerRedeemSession(
              session,
              Number(balance._sum.amount || 0),
            ),
          };
        }
        if (session.status !== POS_LOYALTY_REDEMPTION_STATUS.PENDING) {
          return {
            status: 409,
            body: { message: "Энэ M Point QR ашиглах боломжгүй байна" },
          };
        }
        if (session.expiresAt.getTime() <= Date.now()) {
          await updateRedeemSessionStatus(tx, {
            id: session.id,
            status: POS_LOYALTY_REDEMPTION_STATUS.EXPIRED,
            expectedStatus: POS_LOYALTY_REDEMPTION_STATUS.PENDING,
          });
          return {
            status: 409,
            body: { message: "M Point QR хугацаа дууссан байна" },
          };
        }

        const balance = await tx.mPointLedger.aggregate({
          where: { userId },
          _sum: { amount: true },
        });
        const currentBalance = Number(balance._sum.amount || 0);
        if (session.requestedPoints > currentBalance) {
          return {
            status: 409,
            body: {
              message: `M Point үлдэгдэл хүрэлцэхгүй байна. Боломжит: ${currentBalance}`,
            },
          };
        }

        const confirmedCount = await updateRedeemSessionStatus(tx, {
          id: session.id,
          status: POS_LOYALTY_REDEMPTION_STATUS.CONFIRMED,
          expectedStatus: POS_LOYALTY_REDEMPTION_STATUS.PENDING,
          confirmedAt: new Date(),
        });
        const confirmed = await selectRedeemSessionByToken(tx, token);

        if (confirmedCount !== 1 && confirmed?.status !== POS_LOYALTY_REDEMPTION_STATUS.CONFIRMED) {
          return {
            status: 409,
            body: { message: "M Point QR status changed" },
          };
        }

        return {
          status: 200,
          body: mapCustomerRedeemSession(confirmed!, currentBalance),
        };
      });

      return res.status(result.status).json(result.body);
    } catch (error) {
      console.error("POST /customer/loyalty/redeem-sessions/:token/confirm error", error);
      return res.status(500).json({ message: "M Point QR баталгаажуулахад алдаа гарлаа" });
    }
  },
);

router.get("/customer/loyalty/points", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const balance = await prisma.mPointLedger.aggregate({
      where: { userId },
      _sum: { amount: true },
    });
    res.json({ points: Number(balance._sum.amount || 0) });
  } catch (error) {
    console.error("GET /customer/loyalty/points error", error);
    res.status(500).json({ message: "Онооны үлдэгдэл авахад алдаа гарлаа" });
  }
});

// ── GET /customer/loyalty/history — points history transaction log
router.get("/customer/loyalty/history", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const history = await prisma.mPointLedger.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(
      history.map((entry) => ({
        id: entry.id,
        type: entry.type,
        description: entry.description,
        amount: `${entry.amount > 0 ? "+" : ""}${entry.amount} M`,
        rawAmount: entry.amount,
        balanceAfter: entry.balanceAfter,
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
        invoiceId: entry.invoiceId,
        date: entry.createdAt,
      })),
    );
  } catch (error) {
    console.error("GET /customer/loyalty/history error", error);
    res.status(500).json({ message: "Онооны түүх авахад алдаа гарлаа" });
  }
});

// ── GET /customer/loyalty/coupons — active promotional coupons
router.get("/customer/loyalty/coupons", requireAuth, async (req, res) => {
  try {
    const coupons = [
      {
        id: "c1",
        title: "5%-ийн урамшуулал",
        subtitle: "Бүх бараанд 5% хямдрал",
        expiryDate: "2026-06-30T23:59:59Z",
        code: "WELCOME5",
      },
      {
        id: "c2",
        title: "Ням гараг урамшуулал",
        subtitle: "Хүнсний бараанд 10% хямдрал",
        expiryDate: "2026-06-15T23:59:59Z",
        code: "SUNDAY10",
      },
    ];
    res.json(coupons);
  } catch (error) {
    console.error("GET /customer/loyalty/coupons error", error);
    res.status(500).json({ message: "Идэвхтэй купон авахад алдаа гарлаа" });
  }
});

export default router;
