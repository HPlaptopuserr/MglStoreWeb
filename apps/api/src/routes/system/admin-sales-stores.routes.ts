import { Router, type Router as RouterType } from "express";
import { requireAuth, requireAnyAdmin } from "../../middleware/auth";
import {
  listAdminSalesStores,
  getAdminSalesStoreSummary,
} from "../../services/admin-sales-stores.service";

import { getAdminSalesStoreDetails } from "../../services/admin-sales-store-details.service";

import { exportAdminSalesStores } from "../../services/admin-sales-stores-export.service";

const router: RouterType = Router();
router.get(
  "/admin/statistics/stores",
  requireAuth,
  requireAnyAdmin,
  async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.json(await listAdminSalesStores(req.query));
    } catch (error) {
      console.error("[admin/statistics/stores]", error);
      res
        .status(500)
        .json({ message: "Дэлгүүрийн мэдээлэл ачаалахад алдаа гарлаа" });
    }
  },
);
router.get(
  "/admin/statistics/stores/summary",
  requireAuth,
  requireAnyAdmin,
  async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.json(await getAdminSalesStoreSummary(req.query));
    } catch (error) {
      console.error("[admin/statistics/stores/summary]", error);
      res
        .status(500)
        .json({ message: "Дэлгүүрийн тоон мэдээлэл ачаалагдсангүй" });
    }
  },
);
router.get(
  "/admin/statistics/stores/export.xlsx",
  requireAuth,
  requireAnyAdmin,
  async (req, res) => {
    try {
      const buffer = await exportAdminSalesStores(req.query);
      res.setHeader("Cache-Control", "no-store");
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="mgl-stores-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      );
      res.send(buffer);
    } catch (error) {
      console.error("[admin/statistics/stores/export]", error);
      res
        .status(500)
        .json({
          message:
            "Excel файл үүсгэж чадсангүй. Шүүлтүүрээ нарийсгаад дахин оролдоно уу.",
        });
    }
  },
);
router.get(
  "/admin/statistics/stores/:id",
  requireAuth,
  requireAnyAdmin,
  async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      const details = await getAdminSalesStoreDetails(
        String(req.params.id),
        req.query,
      );
      if (!details)
        return res
          .status(404)
          .json({ message: "Дэлгүүрийн бүртгэл олдсонгүй" });
      return res.json(details);
    } catch (error) {
      console.error("[admin/statistics/stores/detail]", error);
      return res
        .status(500)
        .json({ message: "Дэлгүүрийн дэлгэрэнгүй мэдээлэл ачаалагдсангүй" });
    }
  },
);
export default router;
