import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { requireAuth } from "../../middleware/auth";

const router: ExpressRouter = Router();

// ── GET /customer/purchases — paid project/franchise files owned by account
router.get("/customer/purchases", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const purchases = await prisma.paidAccessPurchase.findMany({
      where: { userId },
      orderBy: { purchasedAt: "desc" },
    });

    res.json({
      purchases: purchases.map((purchase) => ({
        id: purchase.id,
        sourceType: purchase.sourceType,
        itemId: purchase.itemId,
        title: purchase.title,
        fileUrl: purchase.fileUrl,
        fileName: purchase.fileName,
        amount: purchase.amount,
        invoiceId: purchase.invoiceId,
        purchasedAt: purchase.purchasedAt,
      })),
    });
  } catch (error) {
    console.error("GET /customer/purchases error", error);
    res.status(500).json({ message: "Худалдан авсан файлууд авахад алдаа гарлаа" });
  }
});

// ── GET /customer/loyalty/points — current points balance
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
      { id: "c1", title: "5%-ийн урамшуулал", subtitle: "Бүх бараанд 5% хямдрал", expiryDate: "2026-06-30T23:59:59Z", code: "WELCOME5" },
      { id: "c2", title: "Ням гараг урамшуулал", subtitle: "Хүнсний бараанд 10% хямдрал", expiryDate: "2026-06-15T23:59:59Z", code: "SUNDAY10" }
    ];
    res.json(coupons);
  } catch (error) {
    console.error("GET /customer/loyalty/coupons error", error);
    res.status(500).json({ message: "Идэвхтэй купон авахад алдаа гарлаа" });
  }
});

export default router;
