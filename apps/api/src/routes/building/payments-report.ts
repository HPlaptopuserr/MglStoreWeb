import { Router, type Router as ExpressRouter } from "express";
import { prisma, Prisma } from "@mgl/database";
import {
  monthlyPaymentsReport,
  paymentMonthStart,
} from "../../services/building/monthly-payments";

const router: ExpressRouter = Router();
router.get("/admin/payments-report", async (req, res) => {
  const now = new Date();
  const year = Number(
    req.query.year ?? new Date(now.getTime() + 8 * 3600000).getUTCFullYear(),
  );
  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100 ||
    (req.query.project !== undefined &&
      (typeof req.query.project !== "string" || req.query.project.length > 100))
  )
    return res
      .status(400)
      .json({ message: "Он, төслийн шүүлтүүр буруу байна." });
  const project: Prisma.BarilgaProjectWhereInput = {
    deletedAt: null,
    organization: res.locals.buildingScope as Prisma.OrganizationWhereInput,
    ...(req.query.project ? { id: String(req.query.project) } : {}),
  };
  const reservation: Prisma.BarilgaReservationWhereInput = {
    status: { in: ["ACTIVE", "CONVERTED"] },
    unit: { floor: { block: { project } } },
  };
  const range = {
    gte: paymentMonthStart(year - 1, 12),
    lt: paymentMonthStart(year + 1, 1),
  };
  const result = await prisma.$transaction(
    async (tx) => {
      const [schedules, payments] = await Promise.all([
        tx.barilgaPaymentSchedule.findMany({
          where: { reservation, dueDate: range, status: { not: "CANCELLED" } },
          select: { amount: true, status: true, dueDate: true },
        }),
        tx.barilgaPayment.findMany({
          where: {
            reservation,
            status: "PAID",
            OR: [{ paidAt: range }, { paidAt: null }],
          },
          select: { amount: true, status: true, paidAt: true },
        }),
      ]);
      return monthlyPaymentsReport(year, schedules, payments, now);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  return res.json(result);
});
export default router;
