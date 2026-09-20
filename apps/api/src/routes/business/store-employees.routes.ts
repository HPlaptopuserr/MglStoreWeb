import {
  Router,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import rateLimit from "express-rate-limit";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import {
  assignStoreCashier,
  grantStoreCashierAccess,
  searchStorePersonalAccounts,
  setStoreEmployeeStatus,
  StoreEmployeeError,
} from "../../services/store-employees.service";

const router: ExpressRouter = Router();
const searchLimit = rateLimit({
  windowMs: 60_000,
  limit: 40,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "Олон удаа хайлт хийсэн байна. Түр хүлээгээд дахин оролдоно уу.",
  },
});

function actorId(req: Request) {
  return (req as Request & { user: AuthPayload }).user.userId;
}

function requiredText(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim() || value.length > 100)
    throw new StoreEmployeeError(400, `${label} буруу байна.`);
  return value.trim();
}

function handleError(res: Response, error: unknown) {
  if (error instanceof StoreEmployeeError)
    return res.status(error.status).json({ message: error.message });
  console.error("store employees error", error);
  return res.status(500).json({
    message: "Үйлдлийг гүйцэтгэж чадсангүй. Түр хүлээгээд дахин оролдоно уу.",
  });
}

router.get(
  "/org/members/personal-accounts",
  requireAuth,
  searchLimit,
  async (req, res) => {
    try {
      const organizationId = requiredText(
        req.query.organizationId,
        "Дэлгүүрийн мэдээлэл",
      );
      const search =
        typeof req.query.search === "string" ? req.query.search : "";
      res.set("Cache-Control", "no-store");
      return res.json(
        await searchStorePersonalAccounts(actorId(req), organizationId, search),
      );
    } catch (error) {
      return handleError(res, error);
    }
  },
);

router.post(
  "/org/members/assign-personal-account",
  requireAuth,
  async (req, res) => {
    try {
      const body = req.body as Record<string, unknown> | undefined;
      const organizationId = requiredText(
        body?.organizationId,
        "Дэлгүүрийн мэдээлэл",
      );
      const userId = requiredText(body?.userId, "Сонгосон хэрэглэгч");
      if (body?.assignment !== "POS_CASHIER")
        throw new StoreEmployeeError(400, "Оноох ажлаа зөв сонгоно уу.");
      return res
        .status(201)
        .json(await assignStoreCashier(actorId(req), organizationId, userId));
    } catch (error) {
      return handleError(res, error);
    }
  },
);

router.patch("/org/members/:memberId/status", requireAuth, async (req, res) => {
  try {
    const body = req.body as Record<string, unknown> | undefined;
    const organizationId = requiredText(
      body?.organizationId,
      "Дэлгүүрийн мэдээлэл",
    );
    if (typeof body?.isActive !== "boolean")
      throw new StoreEmployeeError(400, "Ажилтны төлөв буруу байна.");
    return res.json(
      await setStoreEmployeeStatus(
        actorId(req),
        organizationId,
        req.params.memberId,
        body.isActive,
      ),
    );
  } catch (error) {
    return handleError(res, error);
  }
});

router.post(
  "/org/members/:memberId/assign-cashier",
  requireAuth,
  async (req, res) => {
    try {
      const body = req.body as Record<string, unknown> | undefined;
      const organizationId = requiredText(
        body?.organizationId,
        "Дэлгүүрийн мэдээлэл",
      );
      return res.json(
        await grantStoreCashierAccess(
          actorId(req),
          organizationId,
          req.params.memberId,
        ),
      );
    } catch (error) {
      return handleError(res, error);
    }
  },
);

export default router;
