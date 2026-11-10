import {
  Router,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import { readStoreMiniApps } from "../../services/store-mini-app-settings";
import {
  createStoreOwnerProInvoice,
  checkStoreOwnerProPayment,
  recoverStoreOwnerProPayment,
  StoreOwnerProError,
} from "../../services/store-owner-pro.service";
import {
  STORE_OWNER_PRO_PRICE,
  STORE_OWNER_PRO_MONTHS,
} from "../../services/store-owner-pro-policy";

const router: ExpressRouter = Router();
const base = "/store/store-owners/pro";
const paymentLimit = rateLimit({
  windowMs: 60_000,
  limit: 60,
  keyGenerator: (_req, res) => String(res.locals.proUserId),
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const invoiceLimit = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  keyGenerator: (_req, res) => String(res.locals.proUserId),
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

function fail(res: Response, error: unknown) {
  if (error instanceof StoreOwnerProError)
    return res.status(error.status).json({ message: error.message });
  console.error(
    "Store owner Pro request failed",
    error instanceof Error ? error.name : "Unknown error",
  );
  return res.status(502).json({
    message:
      "Pro төлбөрийн үйлчилгээтэй холбогдож чадсангүй. Дахин оролдоно уу.",
  });
}

const callbackLimit = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

// Public callbacks only trigger an authenticated provider lookup.
router.all(`${base}/callback`, callbackLimit, async (req, res) => {
  const invoiceId =
    typeof req.query.invoiceId === "string" ? req.query.invoiceId : "";
  if (!invoiceId || invoiceId.length > 100) return res.sendStatus(400);
  try {
    await checkStoreOwnerProPayment(invoiceId);
    return res.json({ received: true });
  } catch (error: unknown) {
    return fail(res, error);
  }
});

router.use(base, requireAuth, async (req: Request, res, next) => {
  const auth = (req as Request & { user?: AuthPayload }).user;
  try {
    const user =
      auth &&
      (await prisma.user.findFirst({
        where: { id: auth.userId, isActive: true, deletedAt: null },
        select: { id: true },
      }));
    if (!user) return res.status(401).json({ message: "Нэвтэрнэ үү." });
    res.locals.proUserId = user.id;
    res.setHeader("Cache-Control", "private, no-store");
    return next();
  } catch (error: unknown) {
    return fail(res, error);
  }
});

router.get(base, paymentLimit, async (_req, res) => {
  try {
    const userId = String(res.locals.proUserId);
    const [access, config] = await Promise.all([
      recoverStoreOwnerProPayment(userId),
      readStoreMiniApps(),
    ]);
    const app = config.settings["store-owners"];
    return res.json({
      ...access,
      price: STORE_OWNER_PRO_PRICE,
      durationMonths: STORE_OWNER_PRO_MONTHS,
      available: app.enabled && app.sourceIds.length > 0,
    });
  } catch (error: unknown) {
    return fail(res, error);
  }
});

router.post(`${base}/invoice`, invoiceLimit, async (_req, res) => {
  try {
    const config = await readStoreMiniApps();
    const app = config.settings["store-owners"];
    if (!app.enabled || !app.sourceIds.length)
      throw new StoreOwnerProError(
        409,
        "Каталог бэлтгэгдэж байна. Идэвхжсэний дараа Pro эрх авах боломжтой.",
      );
    const payment = await createStoreOwnerProInvoice(
      String(res.locals.proUserId),
    );
    return res.json({
      invoiceId: payment.id,
      amount: payment.amount,
      qrText: payment.qrText,
      qrImage: "",
      deepLinks: payment.deepLinks,
      expiresAt: payment.invoiceExpiresAt.toISOString(),
    });
  } catch (error: unknown) {
    return fail(res, error);
  }
});

router.post(`${base}/invoices/:id/check`, paymentLimit, async (req, res) => {
  try {
    const invoiceId = String(req.params.id);
    if (invoiceId.length > 100)
      throw new StoreOwnerProError(404, "Нэхэмжлэх олдсонгүй.");
    const payment = await checkStoreOwnerProPayment(
      invoiceId,
      String(res.locals.proUserId),
    );
    return res.json({
      status:
        payment.status === "PENDING" &&
        payment.invoiceExpiresAt.getTime() <= Date.now()
          ? "EXPIRED"
          : payment.status,
      accessExpiresAt: payment.accessExpiresAt?.toISOString() ?? null,
    });
  } catch (error: unknown) {
    return fail(res, error);
  }
});

export default router;
