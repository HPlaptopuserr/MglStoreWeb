import { prisma } from "@mgl/database";

const DAY_MS = 24 * 60 * 60 * 1000;

export type FinancialOverviewWindow = 7 | 30 | 90 | "all";

type SourceSummary = {
  amount: number;
  transactions: number;
};

type WindowRange = {
  since: Date;
  until?: Date;
};

const amount = (value: unknown): number => Number(value ?? 0);

const trend = (current: number, previous: number, allTime: boolean) =>
  allTime || previous <= 0
    ? null
    : Math.round(((current - previous) / previous) * 100);

const paidAtFilter = ({ since, until }: WindowRange) => ({
  gte: since,
  ...(until ? { lt: until } : {}),
});

async function summarizeWindow(range: WindowRange) {
  const [online, pos, stockInvoices, planInvoices] = await Promise.all([
    prisma.order.aggregate({
      where: {
        deletedAt: null,
        status: { not: "CANCELLED" },
        paymentStatus: "PAID",
        payments: {
          some: {
            status: "PAID",
            paidAt: paidAtFilter(range),
          },
        },
      },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.posSale.aggregate({
      where: {
        status: "COMPLETED",
        createdAt: paidAtFilter(range),
      },
      _sum: { grandTotal: true },
      _count: { id: true },
    }),
    prisma.stockRequestPayment.aggregate({
      where: {
        status: "PAID",
        paidAt: paidAtFilter(range),
        OR: [
          { transactionId: null },
          { transactionId: { not: { startsWith: "DEV-QPAY-" } } },
        ],
      },
      _sum: { paidAmount: true },
      _count: { id: true },
    }),
    prisma.orgUpgradePlan.aggregate({
      where: {
        status: "PAID",
        paidAt: paidAtFilter(range),
        grantedByAdmin: false,
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  const sources = {
    onlineOrders: {
      amount: amount(online._sum.total),
      transactions: online._count.id,
    },
    posSales: {
      amount: amount(pos._sum.grandTotal),
      transactions: pos._count.id,
    },
    paidInvoices: {
      amount:
        amount(stockInvoices._sum.paidAmount) +
        amount(planInvoices._sum.amount),
      transactions: stockInvoices._count.id + planInvoices._count.id,
    },
  } satisfies Record<string, SourceSummary>;

  return {
    sources,
    confirmedAmount: Object.values(sources).reduce(
      (sum, source) => sum + source.amount,
      0,
    ),
    confirmedTransactions: Object.values(sources).reduce(
      (sum, source) => sum + source.transactions,
      0,
    ),
  };
}

async function summarizeVerifiedQPay(
  range: WindowRange,
): Promise<SourceSummary> {
  const [online, pos, stock, plans] = await Promise.all([
    prisma.paymentAttempt.aggregate({
      where: {
        method: "QPAY",
        status: "PAID",
        paidAt: paidAtFilter(range),
        order: { deletedAt: null, status: { not: "CANCELLED" } },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.qPayInvoice.aggregate({
      where: {
        status: "PAID",
        paidAt: paidAtFilter(range),
        consumedAt: { not: null },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.stockRequestPayment.aggregate({
      where: {
        status: "PAID",
        paymentMethod: "QPAY",
        paidAt: paidAtFilter(range),
        transactionId: { not: { startsWith: "DEV-QPAY-" } },
      },
      _sum: { paidAmount: true },
      _count: { id: true },
    }),
    prisma.orgUpgradePlan.aggregate({
      where: {
        status: "PAID",
        paidAt: paidAtFilter(range),
        grantedByAdmin: false,
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  return {
    amount:
      amount(online._sum.amount) +
      amount(pos._sum.amount) +
      amount(stock._sum.paidAmount) +
      amount(plans._sum.amount),
    transactions:
      online._count.id + pos._count.id + stock._count.id + plans._count.id,
  };
}

export async function buildSystemFinancialOverview(
  window: FinancialOverviewWindow,
) {
  const allTime = window === "all";
  const now = new Date();
  const days = allTime ? 0 : window;
  const since = allTime ? new Date(0) : new Date(now.getTime() - days * DAY_MS);
  const previousSince = allTime
    ? new Date(0)
    : new Date(now.getTime() - days * 2 * DAY_MS);

  const [current, previous, verifiedQPay] = await Promise.all([
    summarizeWindow({ since, until: now }),
    allTime
      ? Promise.resolve(null)
      : summarizeWindow({ since: previousSince, until: since }),
    summarizeVerifiedQPay({ since, until: now }),
  ]);

  return {
    privacyLevel: "ANONYMIZED_AGGREGATE" as const,
    generatedAt: now.toISOString(),
    windowDays: window,
    confirmedAmount: current.confirmedAmount,
    confirmedTransactions: current.confirmedTransactions,
    amountTrend: trend(
      current.confirmedAmount,
      previous?.confirmedAmount ?? 0,
      allTime,
    ),
    transactionTrend: trend(
      current.confirmedTransactions,
      previous?.confirmedTransactions ?? 0,
      allTime,
    ),
    sources: current.sources,
    verifiedQPay,
    excluded: {
      bankAccountBalances: true,
      organizationBreakdown: true,
      customerIdentity: true,
      pendingAndFailedPayments: true,
      localFakePayments: true,
    },
    note: "Энэ нь банкны дансны үлдэгдэл эсвэл платформын цэвэр орлого биш. Зөвхөн MGL системд баталгаажсан нэргүйжүүлсэн мөнгөн урсгалын aggregate дүн.",
  };
}
