import { Router, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import {
  StoreMiniAppValidationError,
  parseStoreMiniAppSettings,
  STORE_MINI_APP_SETTINGS_KEY,
} from "@mgl/types";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  readStoreMiniApps,
  resolvePhoneGrants,
} from "../../services/store-mini-app-settings";

const router: ExpressRouter = Router();
router.use(
  "/admin/app-control/store-catalogs",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
);
router.get("/admin/app-control/store-catalogs", async (_req, res) => {
  try {
    const [config, warehouses, vendors] = await Promise.all([
      readStoreMiniApps(),
      prisma.warehouse.findMany({
        where: { deletedAt: null, isActive: true, type: "CENTRAL" },
        select: { id: true, name: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
      prisma.organization.findMany({
        where: {
          deletedAt: null,
          status: "ACTIVE",
          type: { in: ["VENDOR", "SUPPLIER"] },
        },
        select: { id: true, name: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
    ]);
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ settings: config.settings, warehouses, vendors });
  } catch {
    res.status(500).json({ message: "Каталогийн тохиргоо ачаалж чадсангүй." });
  }
});
router.put("/admin/app-control/store-catalogs", async (req, res) => {
  try {
    const settings = parseStoreMiniAppSettings(req.body);
    const previous = await readStoreMiniApps();
    const retainedGrants = previous.grants.filter((grant) =>
      settings["store-owners"].allowedPhones.includes(grant.phone),
    );
    const newPhones = settings["store-owners"].allowedPhones.filter(
      (phone) => !retainedGrants.some((grant) => grant.phone === phone),
    );
    const [warehouses, vendors, grants] = await Promise.all([
      prisma.warehouse.count({
        where: {
          id: { in: settings["shared-store"].sourceIds },
          deletedAt: null,
          isActive: true,
          type: "CENTRAL",
        },
      }),
      prisma.organization.count({
        where: {
          id: { in: settings["store-owners"].sourceIds },
          deletedAt: null,
          status: "ACTIVE",
          type: { in: ["VENDOR", "SUPPLIER"] },
        },
      }),
      resolvePhoneGrants(newPhones).then((added) => [
        ...retainedGrants,
        ...added,
      ]),
    ]);
    if (
      warehouses !== settings["shared-store"].sourceIds.length ||
      vendors !== settings["store-owners"].sourceIds.length
    ) {
      return res.status(400).json({
        message:
          "Сонгосон агуулах эсвэл vendor идэвхгүй болсон байна. Жагсаалтаа шинэчилнэ үү.",
      });
    }
    await prisma.siteSetting.upsert({
      where: { key: STORE_MINI_APP_SETTINGS_KEY },
      create: {
        key: STORE_MINI_APP_SETTINGS_KEY,
        value: JSON.stringify({ settings, grants }),
      },
      update: { value: JSON.stringify({ settings, grants }) },
    });
    return res.json({ settings });
  } catch (error: unknown) {
    const validation = error instanceof StoreMiniAppValidationError;
    if (!validation)
      console.error("Store mini app settings save failed", error);
    return res.status(validation ? 400 : 500).json({
      message: validation
        ? error.message
        : "Хадгалах үед алдаа гарлаа. Дахин оролдоно уу.",
    });
  }
});
export default router;
