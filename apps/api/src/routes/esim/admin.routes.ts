import {
  Router,
  type Request,
  type RequestHandler,
  type Router as ExpressRouter,
} from "express";
import { parseEsimSalesSettings } from "@mgl/types";
import type { AuthPayload } from "../../middleware/auth";
import type { EsimCatalogService } from "../../services/esim/catalog-service";
import {
  EsimSettingsConflict,
  type EsimSalesStore,
} from "../../services/esim/sales-settings";
export function createEsimAdminRouter(deps: {
  authorize: RequestHandler[];
  store: EsimSalesStore;
  catalog: EsimCatalogService;
  readiness: () => Record<string, boolean>;
}): ExpressRouter {
  const router = Router();
  router.use("/admin/esim", ...deps.authorize, (_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });
  router.get("/admin/esim/settings", async (_req, res) => {
    try {
      res.json({ ...(await deps.store.read()), readiness: deps.readiness() });
    } catch {
      res.status(503).json({ message: "eSIM тохиргоо ачаалж чадсангүй." });
    }
  });
  router.put("/admin/esim/settings", async (req, res) => {
    let settings;
    const body: unknown = req.body;
    try {
      if (
        !body ||
        typeof body !== "object" ||
        !("settings" in body) ||
        !("revision" in body) ||
        typeof body.revision !== "number" ||
        !Number.isSafeInteger(body.revision) ||
        body.revision < 0
      )
        throw new Error("Тохиргооны хувилбар буруу байна.");
      settings = parseEsimSalesSettings(body.settings);
    } catch (error: unknown) {
      res
        .status(400)
        .json({
          message:
            error instanceof Error ? error.message : "Тохиргоо буруу байна.",
        });
      return;
    }
    const revision = (body as { revision: number }).revision;
    try {
      res.json(
        await deps.store.save(
          settings,
          revision,
          (req as Request & { user: AuthPayload }).user.userId,
        ),
      );
    } catch (error: unknown) {
      res
        .status(error instanceof EsimSettingsConflict ? 409 : 503)
        .json({
          message:
            error instanceof EsimSettingsConflict
              ? "Өөр админ тохиргоог шинэчилсэн байна. Дахин ачаалаад өөрчлөлтөө оруулна уу."
              : "Хадгалж чадсангүй. Дахин оролдоорой.",
        });
    }
  });
  router.get("/admin/esim/offers", async (req, res) => {
    const country =
      typeof req.query.country === "string"
        ? req.query.country.toUpperCase()
        : "CN";
    if (!/^[A-Z]{2}$/.test(country)) {
      res.status(400).json({ message: "Улсын код буруу байна." });
      return;
    }
    try {
      const data = await deps.catalog.list(country);
      if (!data.suppliers.some((s) => s.status === "available"))
        throw new Error("Supplier unavailable");
      res.json({
        offers: data.offers
          .filter((o) => o.supplier === "esim-access")
          .map((o) => ({
            id: o.id,
            title: o.title,
            dataMb: o.dataMb,
            days: o.days,
            countries: o.countries,
          })),
      });
    } catch {
      res
        .status(503)
        .json({ message: "Нийлүүлэгчийн багцуудыг ачаалж чадсангүй." });
    }
  });
  return router;
}
