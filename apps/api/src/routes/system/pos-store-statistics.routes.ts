import { Router, type Router as RouterType } from "express";
import { requireAuth, requireAnyAdmin } from "../../middleware/auth";
import { getPosStoreStatistics } from "../../services/pos-store-statistics.service";

const router: RouterType = Router();
router.get("/admin/statistics/pos-stores/summary", requireAuth, requireAnyAdmin, async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    res.json(await getPosStoreStatistics(req.query.days));
  } catch (error) {
    console.error("[admin/statistics/pos-stores/summary]", error);
    res.status(500).json({ message: "POS дэлгүүрийн статистик ачаалагдсангүй" });
  }
});
export default router;
