import { purchaseRoutes } from "./purchase.routes";
import type { EsimPurchaseService } from "../../services/esim/purchase-service";
import { Router, type Request, type RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import type { AuthPayload } from "../../middleware/auth";
import { EsimCatalogService } from "../../services/esim/catalog-service";
import type { PricingPolicy } from "../../services/esim/pricing";
import { parseQuoteInput, publicOffer } from "./esim.contracts";
import type { EsimQuoteService } from "../../services/esim/quote-service";
interface Dependencies {
  authenticate: RequestHandler;
  activeUser: (id: string) => Promise<boolean>;
  catalog: EsimCatalogService;
  pricing: () => PricingPolicy;
  quotes: () => EsimQuoteService;
  member?: (id: string) => Promise<boolean>;
  checkoutEnabled?: () => boolean;
  terms?: () => string;
  purchases?: () => EsimPurchaseService;
}
export function createEsimRouter(deps: Dependencies): Router {
  const router = Router();
  // A callback is only an acknowledgement. Durable polling verifies payment.
  router.all("/esim/minu/callback", (_req, res) => {
    res.sendStatus(200);
  });
  router.use(
    "/store/esim",
    deps.authenticate,
    rateLimit({
      windowMs: 60000,
      limit: 30,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  router.use("/store/esim", async (req, res, next) => {
    const user = (req as Request & { user?: AuthPayload }).user;
    try {
      if (!user?.userId || !(await deps.activeUser(user.userId))) {
        res.status(403).json({ message: "Идэвхтэй бүртгэл шаардлагатай." });
        return;
      }
      next();
    } catch {
      res.status(503).json({ message: "Үйлчилгээ түр боломжгүй байна." });
    }
  });
  router.use("/store/esim", (_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });
  router.get("/store/esim/catalog", async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    const country =
      typeof req.query.country === "string"
        ? req.query.country.toUpperCase()
        : "CN";
    if (!/^[A-Z]{2}$/.test(country)) {
      res.status(400).json({ message: "Улсын код буруу." });
      return;
    }
    try {
      const catalog = await deps.catalog.list(country);
      if (!catalog.suppliers.some((s) => s.status === "available"))
        throw new Error("No suppliers");
      const user = (req as Request & { user: AuthPayload }).user;
      const member = (await deps.member?.(user.userId)) ?? false;
      const supplierOffers = catalog.offers.filter((offer) => offer.supplier === "esim-access");
      let priceKind: "estimate" | "unavailable" = "estimate";
      let offers: ReturnType<typeof publicOffer>[];
      try {
        const policy = deps.pricing();
        offers = supplierOffers.map((offer) => publicOffer(offer, policy, member));
      } catch {
        // Supplier metadata is useful even while retail pricing is unconfigured.
        // Never substitute a guessed price or expose supplier costs.
        priceKind = "unavailable";
        offers = supplierOffers.map((offer) => publicOffer(offer, null));
      }
      res.json({
        country,
        offers,
        suppliers: catalog.suppliers,
        checkoutAvailable: priceKind === "estimate" && (deps.checkoutEnabled?.() ?? false),
        memberEligible: member,
        priceKind,
        fetchedAt: new Date(catalog.fetchedAt).toISOString(),
      });
    } catch {
      res.status(503).json({
        code: "ESIM_NOT_READY",
        message:
          "eSIM багцын үнэ одоогоор боломжгүй байна. Дараа дахин оролдоорой.",
      });
    }
  });
  router.post("/store/esim/quotes", async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    const input = parseQuoteInput(req.body);
    if (!input) {
      res.status(400).json({ message: "Үнийн хүсэлт буруу." });
      return;
    }
    try {
      const catalog = await deps.catalog.list(input.country);
      const offer = catalog.offers.find((item) => item.id === input.offerId);
      if (!offer) {
        res.status(409).json({
          message: "Багц өөрчлөгдсөн байна. Жагсаалтыг шинэчилнэ үү.",
        });
        return;
      }
      const user = (req as Request & { user: AuthPayload }).user;
      const member = (await deps.member?.(user.userId)) ?? false;
      if (input.memberPrice && !member) {
        res.status(403).json({ message: "Хүчинтэй гишүүнчлэл шаардлагатай." });
        return;
      }
      if (offer.supplier !== "esim-access") {
        res
          .status(409)
          .json({ message: "Энэ багцын борлуулалт нээгдээгүй байна." });
        return;
      }
      res.json(
        deps.quotes().issue(user.userId, offer, deps.pricing(), Date.now(), {
          memberPrice: input.memberPrice,
          checkoutAvailable: deps.checkoutEnabled?.() ?? false,
          terms: deps.terms?.() ?? "",
          country: input.country,
        }),
      );
    } catch {
      res.status(503).json({
        code: "ESIM_NOT_READY",
        message: "Үнэ баталгаажуулах боломжгүй байна.",
      });
    }
  });
  if (deps.purchases) {
    purchaseRoutes(router, deps.purchases);
  } else
    router.post("/store/esim/orders", (_req, res) => {
      res.status(503).json({
        code: "ESIM_CHECKOUT_DISABLED",
        message: "eSIM худалдан авалт хараахан нээгдээгүй байна.",
      });
    });
  return router;
}
