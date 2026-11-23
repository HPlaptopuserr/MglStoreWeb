import { Router, type Router as ExpressRouter, type Request } from "express";
import { prisma } from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../../middleware/auth";
import { calculatePosCreditPayable } from "./credit-interest";

const router: ExpressRouter = Router();
/** Personal debt is scoped exclusively to the authenticated MGL subject. */
router.get("/credit-account", requireAuth, async (req, res) => {
  const subject = (req as Request & { user?: AuthPayload }).user?.userId;
  if (!subject) return res.sendStatus(401);
  res.setHeader("Cache-Control", "no-store");
  try {
    const user = await prisma.user.findFirst({
      where: { id: subject, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (!user) return res.sendStatus(401);
    const snapshot = new Date();
    const rows = await prisma.posCreditSale.findMany({
      where: { borrowerUserId: user.id, status: { in: ["OPEN", "OVERDUE"] } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        status: true,
        principalAmount: true,
        monthlyInterestRate: true,
        totalInterest: true,
        totalDue: true,
        paidAmount: true,
        termMonths: true,
        dueDate: true,
        paidAt: true,
        createdAt: true,
        organization: { select: { id: true, name: true } },
        sale: { select: { createdAt: true, receiptNo: true } },
      },
    });
    const credits = rows.map((row) => {
      const payable = calculatePosCreditPayable(
        { ...row, createdAt: row.sale.createdAt },
        snapshot,
      );
      return {
        id: row.id,
        status: row.status,
        organization: row.organization,
        receiptNo: row.sale.receiptNo,
        createdAt: row.sale.createdAt.toISOString(),
        dueDate: payable.dueDate?.toISOString() || null,
        principalAmount: Number(row.principalAmount),
        paidAmount: Number(row.paidAmount || 0),
        totalInterest: payable.totalInterest,
        totalAmount: payable.totalDue,
        remainingDue: payable.remainingDue,
      };
    });
    const remainingCents = credits.reduce(
      (sum, credit) => sum + Math.round(credit.remainingDue * 100),
      0,
    );
    return res.json({
      asOf: snapshot.toISOString(),
      totalRemaining: remainingCents / 100,
      credits,
    });
  } catch (error: unknown) {
    console.error("personal credit account read failed", error);
    return res
      .status(503)
      .json({ message: "Зээлийн мэдээлэл авч чадсангүй. Дахин оролдоно уу." });
  }
});
export default router;
