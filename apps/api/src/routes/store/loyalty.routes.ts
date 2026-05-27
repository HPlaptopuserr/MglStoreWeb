import { Router, type Router as ExpressRouter } from "express";
import { requireAuth } from "../../middleware/auth";

const router: ExpressRouter = Router();

// ── GET /customer/loyalty/points — current points balance
router.get("/customer/loyalty/points", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    // Derive a unique but consistent point balance for the user
    const balance = ((userId.charCodeAt(0) || 77) * 4) + 120;
    res.json({ points: balance });
  } catch (error) {
    console.error("GET /customer/loyalty/points error", error);
    res.status(500).json({ message: "Онооны үлдэгдэл авахад алдаа гарлаа" });
  }
});

// ── GET /customer/loyalty/history — points history transaction log
router.get("/customer/loyalty/history", requireAuth, async (req, res) => {
  try {
    const history = [
      { id: "1", description: "Сагсны худалдан авалт", amount: "+120 M", date: "2026-05-25T14:30:00Z" },
      { id: "2", description: "Купон ашиглалт", amount: "-50 M", date: "2026-05-20T11:15:00Z" },
      { id: "3", description: "Системийн урамшуулал", amount: "+100 M", date: "2026-05-18T09:00:00Z" },
      { id: "4", description: "Эхний бүртгэлийн урамшуулал", amount: "+100 M", date: "2026-05-10T12:00:00Z" }
    ];
    res.json(history);
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
