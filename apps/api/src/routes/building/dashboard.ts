import { Router, type Router as ExpressRouter } from "express";
import { prisma, Prisma } from "@mgl/database";
const router: ExpressRouter = Router();
// The persistent sidebar needs one count, not the complete financial dashboard.
router.get("/admin/navigation", async (_req, res) => {
  const day = new Date(
    Math.floor((Date.now() + 28800000) / 86400000) * 86400000 - 28800000,
  );
  const overdueCount = await prisma.barilgaReservation.count({
    where: {
      status: { in: ["ACTIVE", "CONVERTED"] },
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
      paymentSchedule: {
        some: { status: { in: ["PENDING", "OVERDUE"] }, dueDate: { lt: day } },
      },
    },
  });
  res.json({ overdueCount });
});
router.get("/admin/dashboard", async (req, res) => {
  const id =
    typeof req.query.project === "string" ? req.query.project : undefined;
  const project: Prisma.BarilgaProjectWhereInput = {
    deletedAt: null,
    organization: res.locals.buildingScope as Prisma.OrganizationWhereInput,
    ...(id ? { id } : {}),
  };
  const now = new Date();
  const local = new Date(now.getTime() + 8 * 3600000);
  const day = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) -
      8 * 3600000,
  );
  const month = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - 8 * 3600000,
  );
  const nextMonth = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - 8 * 3600000,
  );
  const result = await prisma.$transaction(
    async (tx) => {
      const [blocks, reservations, overdue] = await Promise.all([
        tx.barilgaBlock.findMany({
          where: { project },
          select: {
            id: true,
            name: true,
            projectId: true,
            project: { select: { title: true } },
            floors: { select: { units: { select: { status: true } } } },
          },
          orderBy: { sortOrder: "asc" },
        }),
        tx.barilgaReservation.findMany({
          where: {
            unit: { floor: { block: { project } } },
            status: { in: ["ACTIVE", "CONVERTED"] },
          },
          select: {
            status: true,
            agreedPriceTotal: true,
            payments: { where: { status: "PAID" }, select: { amount: true } },
            paymentSchedule: {
              where: { status: { not: "CANCELLED" } },
              select: { amount: true, status: true, dueDate: true },
            },
          },
        }),
        tx.barilgaPaymentSchedule.findMany({
          where: {
            status: { in: ["PENDING", "OVERDUE"] },
            dueDate: { lt: day },
            reservation: {
              status: { in: ["ACTIVE", "CONVERTED"] },
              unit: { floor: { block: { project } } },
            },
          },
          select: {
            id: true,
            amount: true,
            dueDate: true,
            reservation: {
              select: {
                id: true,
                customerName: true,
                customerPhone: true,
                unit: {
                  select: {
                    unitNo: true,
                    floor: {
                      select: {
                        block: { select: { name: true, projectId: true } },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { dueDate: "asc" },
        }),
      ]);
      const totals: Record<string, number> = {};
      const summaries = blocks.map((block) => {
        const units = block.floors.flatMap((f) => f.units);
        for (const unit of units)
          totals[unit.status] = (totals[unit.status] ?? 0) + 1;
        return {
          id: block.id,
          name: block.name,
          projectId: block.projectId,
          projectTitle: block.project.title,
          floors: block.floors.length,
          total: units.length,
          sold: units.filter((u) => u.status === "SOLD").length,
          available: units.filter((u) => u.status === "AVAILABLE").length,
        };
      });
      let agreed = new Prisma.Decimal(0),
        paid = new Prisma.Decimal(0),
        due = new Prisma.Decimal(0),
        monthPaid = new Prisma.Decimal(0);
      for (const r of reservations) {
        if (r.agreedPriceTotal) agreed = agreed.add(r.agreedPriceTotal);
        for (const p of r.payments) paid = paid.add(p.amount);
        for (const s of r.paymentSchedule)
          if (s.dueDate >= month && s.dueDate < nextMonth) {
            due = due.add(s.amount);
            if (s.status === "PAID") monthPaid = monthPaid.add(s.amount);
          }
      }
      return {
        totals,
        blocks: summaries,
        finance: {
          agreed: agreed.toString(),
          paid: paid.toString(),
          remaining: Prisma.Decimal.max(0, agreed.sub(paid)).toString(),
          due: due.toString(),
          monthPaid: monthPaid.toString(),
          overdue: overdue
            .reduce((sum, s) => sum.add(s.amount), new Prisma.Decimal(0))
            .toString(),
          reservations: reservations.length,
          missingPrices: reservations.filter((r) => r.agreedPriceTotal === null)
            .length,
        },
        overdue: overdue.map((s) => ({
          id: s.id,
          reference: s.reservation.id,
          customer: s.reservation.customerName ?? "Нэр оруулаагүй",
          phone: s.reservation.customerPhone,
          block: s.reservation.unit.floor.block.name,
          projectId: s.reservation.unit.floor.block.projectId,
          unit: s.reservation.unit.unitNo,
          amount: s.amount.toString(),
          dueDate: s.dueDate.toISOString(),
          days: Math.ceil((day.getTime() - s.dueDate.getTime()) / 86400000),
        })),
        updatedAt: now.toISOString(),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  res.json(result);
});
export default router;
