import { Router, type Router as ExpressRouter } from "express";
import { prisma, Prisma } from "@mgl/database";
const router: ExpressRouter = Router();
router.get("/admin/customers", async (req, res) => {
  const search =
    typeof req.query.search === "string"
      ? req.query.search.trim().slice(0, 150)
      : "";
  const reservation = typeof req.query.reservation === "string"
    ? req.query.reservation.trim() : "";
  const page = Number(req.query.page ?? 1);
  const status =
    typeof req.query.status === "string" ? req.query.status : "ALL";
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 100000 ||
    !["ALL", "ACTIVE", "CONVERTED", "OVERDUE", "CANCELLED"].includes(status)
  )
    return res.status(400).json({ message: "Шүүлтүүр буруу байна" });
  const today = new Date();
  today.setTime(
    Math.floor((today.getTime() + 28800000) / 86400000) * 86400000 - 28800000,
  );
  const scope: Prisma.BarilgaReservationWhereInput = {
    unit: {
      floor: {
        block: {
          project: {
            deletedAt: null,
            organization: res.locals
              .buildingScope as Prisma.OrganizationWhereInput,
          },
        },
      },
    },
  };
  const late: Prisma.BarilgaReservationWhereInput = {
    status: { in: ["ACTIVE", "CONVERTED"] },
    paymentSchedule: {
      some: { status: { in: ["PENDING", "OVERDUE"] }, dueDate: { lt: today } },
    },
  };
  const where: Prisma.BarilgaReservationWhereInput = {
    AND: [
      scope,
      reservation ? { id: reservation } : {},
      status === "OVERDUE"
        ? late
        : status === "ALL"
          ? {}
          : { status: status as "ACTIVE" | "CONVERTED" | "CANCELLED" },
      search
        ? {
            OR: [
              { customerName: { contains: search, mode: "insensitive" } },
              { customerPhone: { contains: search } },
              { id: { contains: search } },
              { unit: { unitNo: { contains: search } } },
            ],
          }
        : {},
    ],
  };
  const data = await prisma.$transaction(
    async (tx) => {
      const [total, all, active, converted, overdue, records] =
        await Promise.all([
          tx.barilgaReservation.count({ where }),
          tx.barilgaReservation.count({ where: scope }),
          tx.barilgaReservation.count({
            where: { AND: [scope, { status: "ACTIVE" }] },
          }),
          tx.barilgaReservation.count({
            where: { AND: [scope, { status: "CONVERTED" }] },
          }),
          tx.barilgaReservation.count({ where: { AND: [scope, late] } }),
          tx.barilgaReservation.findMany({
            where,
            take: 10,
            skip: (page - 1) * 10,
            orderBy: [{ createdAt: "desc" }, { id: "asc" }],
            select: {
              id: true,
              customerName: true,
              customerPhone: true,
              status: true,
              agreedPriceTotal: true,
              agreedPricePerM2: true,
              downPaymentPercent: true,
              note: true,
              createdAt: true,
              unit: {
                select: {
                  unitNo: true,
                  rooms: true,
                  areaM2: true,
                  floor: {
                    select: {
                      number: true,
                      block: { select: { name: true, projectId: true } },
                    },
                  },
                },
              },
              payments: {
                where: { status: "PAID" },
                select: {
                  id: true,
                  kind: true,
                  provider: true,
                  amount: true,
                  paidAt: true,
                  invoiceNumber: true,
                },
                orderBy: { paidAt: "desc" },
              },
              paymentSchedule: {
                where: { status: { not: "CANCELLED" } },
                select: {
                  id: true,
                  amount: true,
                  dueDate: true,
                  status: true,
                  paidAt: true,
                },
                orderBy: { dueDate: "asc" },
              },
            },
          }),
        ]);
      return {
        total,
        page,
        pageSize: 10,
        metrics: { all, active, converted, overdue },
        records: records.map((r) => {
          const paid = r.payments.reduce(
            (sum, p) => sum.add(p.amount),
            new Prisma.Decimal(0),
          );
          const downPaymentPaid = r.payments
            .filter((p) => p.kind === "DOWN_PAYMENT")
            .reduce((sum, p) => sum.add(p.amount), new Prisma.Decimal(0));
          const months = new Map<
            string,
            {
              total: Prisma.Decimal;
              downPayment: Prisma.Decimal;
              monthly: Prisma.Decimal;
              fullPayment: Prisma.Decimal;
              count: number;
            }
          >();
          for (const payment of r.payments) {
            const month = payment.paidAt
              ? new Date(payment.paidAt.getTime() + 8 * 3600000)
                  .toISOString()
                  .slice(0, 7)
              : "unknown";
            const row = months.get(month) ?? {
              total: new Prisma.Decimal(0),
              downPayment: new Prisma.Decimal(0),
              monthly: new Prisma.Decimal(0),
              fullPayment: new Prisma.Decimal(0),
              count: 0,
            };
            row.total = row.total.add(payment.amount);
            const key =
              payment.kind === "DOWN_PAYMENT"
                ? "downPayment"
                : payment.kind === "MONTHLY"
                  ? "monthly"
                  : "fullPayment";
            row[key] = row[key].add(payment.amount);
            row.count++;
            months.set(month, row);
          }
          return {
            ...r,
            downPaymentPaid: downPaymentPaid.toString(),
            downPaymentExpected:
              r.agreedPriceTotal && r.downPaymentPercent !== null
                ? r.agreedPriceTotal
                    .mul(r.downPaymentPercent)
                    .div(100)
                    .toFixed(2)
                : null,
            monthlyPayments: [...months.entries()]
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([month, row]) => ({
                month,
                count: row.count,
                total: row.total.toString(),
                downPayment: row.downPayment.toString(),
                monthly: row.monthly.toString(),
                fullPayment: row.fullPayment.toString(),
              })),
            paid: paid.toString(),
            remaining: r.agreedPriceTotal
              ? Prisma.Decimal.max(0, r.agreedPriceTotal.sub(paid)).toString()
              : null,
            overdue: r.paymentSchedule
              .filter((s) => s.status !== "PAID" && s.dueDate < today)
              .reduce((sum, s) => sum.add(s.amount), new Prisma.Decimal(0))
              .toString(),
          };
        }),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  res.json(data);
});
export default router;
