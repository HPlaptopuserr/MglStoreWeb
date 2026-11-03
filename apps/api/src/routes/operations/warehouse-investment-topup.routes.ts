import {
  Router,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import rateLimit from "express-rate-limit";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import { WarehouseViewerError } from "../../services/warehouse-viewer.policy";
import { assertWarehouseViewerManagement } from "../../services/warehouse-viewer-access.service";
import {
  createInvestmentTopUp,
  listInvestmentTopUps,
  settleInvestmentTopUp,
} from "../../services/warehouse-investment-topup.service";
import { connectWarehousePaymentAccount } from "../../services/warehouse-payment-account.service";
import {
  getSystemQrCityList,
  getSystemQrCategoryList,
  getSystemQrKhorooList,
} from "../../services/systemqr";

const router: ExpressRouter = Router();
const actor = (req: Request) => (req as Request & { user: AuthPayload }).user;
const limit = rateLimit({
  windowMs: 60000,
  limit: 20,
  keyGenerator: (req) => actor(req).userId,
});
const handle =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "private, no-store");
    try {
      await fn(req, res);
    } catch (error) {
      if (error instanceof WarehouseViewerError)
        return res.status(error.status).json({ message: error.message });
      console.error(
        "[warehouse-investment-payment]",
        error instanceof Error ? error.name : "Unknown error",
      );
      return res
        .status(503)
        .json({
          message:
            "Төлбөрийн үйлчилгээтэй холбогдож чадсангүй. Дахин оролдоно уу.",
        });
    }
  };
const base = "/warehouse-viewer/warehouses/:id/top-ups";
router.get(
  base,
  requireAuth,
  handle(async (req, res) =>
    res.json(await listInvestmentTopUps(actor(req), String(req.params.id))),
  ),
);
router.post(
  base,
  requireAuth,
  limit,
  handle(async (req, res) =>
    res.json(
      await createInvestmentTopUp(actor(req), String(req.params.id), req.body),
    ),
  ),
);
router.post(
  `${base}/:topUpId/check`,
  requireAuth,
  limit,
  handle(async (req, res) =>
    res.json(
      await settleInvestmentTopUp(
        actor(req),
        String(req.params.id),
        String(req.params.topUpId),
        false,
      ),
    ),
  ),
);
router.post(
  `${base}/:topUpId/confirm`,
  requireAuth,
  limit,
  handle(async (req, res) =>
    res.json(
      await settleInvestmentTopUp(
        actor(req),
        String(req.params.id),
        String(req.params.topUpId),
        true,
      ),
    ),
  ),
);
router.post(
  "/warehouses/:id/payment-account/connect",
  requireAuth,
  limit,
  handle(async (req, res) =>
    res.json(
      await connectWarehousePaymentAccount(
        actor(req),
        String(req.params.id),
        req.body,
      ),
    ),
  ),
);
router.get(
  "/warehouses/:id/payment-account/catalog",
  requireAuth,
  limit,
  handle(async (req, res) => {
    await assertWarehouseViewerManagement(actor(req), String(req.params.id));
    const district =
      typeof req.query.districtId === "string" ? req.query.districtId : "";
    if (district)
      return res.json({ khoroos: await getSystemQrKhorooList(district) });
    const [cities, categories] = await Promise.all([
      getSystemQrCityList(),
      getSystemQrCategoryList(),
    ]);
    return res.json({ cities, categories });
  }),
);
export default router;
