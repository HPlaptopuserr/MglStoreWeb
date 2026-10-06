import {
  Router,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import { Prisma, prisma } from "@mgl/database";
import { getAuthUser, type AuthUser } from "./_shared";
import {
  inputRecord,
  parseCountEdits,
  StocktakeError,
  stocktakePermissions,
} from "../../../services/stocktake.policy";
import {
  createStocktake,
  mutateStocktake,
  type StocktakeAction,
} from "../../../services/stocktake.service";

const router: ExpressRouter = Router();
const base = "/pos/stocktakes/:organizationId";
function route(
  handler: (
    req: Request,
    res: Response,
    actor: AuthUser,
    organizationId: string,
    canApprove: boolean,
  ) => Promise<unknown>,
) {
  return async (req: Request, res: Response) => {
    try {
      const actor = await getAuthUser(req);
      if (!actor || !actor.isActive || actor.deletedAt)
        return res.status(401).json({ message: "Нэвтрэлт шаардлагатай" });
      const organizationId = String(req.params.organizationId);
      const permissions = stocktakePermissions(actor, organizationId);
      if (!permissions.canCount)
        return res.status(403).json({ message: "Тооллого хийх эрхгүй байна" });
      return await handler(
        req,
        res,
        actor,
        organizationId,
        permissions.canApprove,
      );
    } catch (error) {
      if (error instanceof StocktakeError)
        return res.status(error.status).json({ message: error.message });
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (["P2034", "P2002"].includes(error.code) ||
          (error.code === "P2010" &&
            ["40001", "40P01"].includes(String(error.meta?.code))))
      )
        return res.status(409).json({
          message:
            "Өгөгдөл зэрэг шинэчлэгдсэн байна. Дахин ачаалаад оролдоно уу.",
        });
      console.error("[stocktake]", error);
      return res.status(500).json({
        message: "Тооллого боловсруулахад алдаа гарлаа. Дахин оролдоно уу.",
      });
    }
  };
}
router.get(
  base,
  route(async (_req, res, _actor, organizationId, canApprove) => {
    const [active, history, warehouses] = await Promise.all([
      prisma.stocktake.findMany({
        where: { organizationId, status: { in: ["DRAFT", "REVIEW"] } },
        orderBy: { createdAt: "desc" },
        include: { warehouse: { select: { name: true } } },
      }),
      prisma.stocktake.findMany({
        where: { organizationId, status: { in: ["APPROVED", "CANCELLED"] } },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { warehouse: { select: { name: true } } },
      }),
      prisma.warehouse.findMany({
        where: {
          type: "VENDOR_INTERNAL",
          isActive: true,
          deletedAt: null,
          organizations: { some: { organizationId } },
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);
    return res.json({
      sessions: [...active, ...history],
      warehouses,
      canApprove,
    });
  }),
);
router.get(
  `${base}/:id`,
  route(async (req, res, _actor, organizationId) => {
    const session = await prisma.stocktake.findFirst({
      where: { id: String(req.params.id), organizationId },
      include: {
        warehouse: { select: { name: true } },
        lines: { orderBy: { name: "asc" } },
      },
    });
    if (!session) throw new StocktakeError("Тооллого олдсонгүй", 404);
    return res.json(session);
  }),
);
router.post(
  base,
  route(async (req, res, actor, organizationId) => {
    const body = inputRecord(req.body);
    if (
      typeof body.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        body.id,
      )
    )
      throw new StocktakeError("Хүсэлтийн давтагдашгүй дугаар буруу байна");
    if (
      typeof body.title !== "string" ||
      !body.title.trim() ||
      body.title.trim().length > 120
    )
      throw new StocktakeError("Тооллогын нэр 1–120 тэмдэгт байна");
    if (body.kind !== "FULL" && body.kind !== "PARTIAL")
      throw new StocktakeError("Тооллогын төрөл буруу байна");
    if (body.warehouseId !== null && typeof body.warehouseId !== "string")
      throw new StocktakeError("Тоолох сангаа сонгоно уу");
    return res.status(201).json(
      await createStocktake({
        id: body.id,
        title: body.title.trim(),
        kind: body.kind,
        warehouseId: body.warehouseId,
        organizationId,
        actorId: actor.id,
      }),
    );
  }),
);
router.patch(
  `${base}/:id`,
  route(async (req, res, actor, organizationId, canApprove) => {
    const body = inputRecord(req.body);
    const actions: StocktakeAction[] = [
      "save",
      "submit",
      "reopen",
      "refresh",
      "approve",
      "cancel",
    ];
    if (
      typeof body.action !== "string" ||
      !actions.includes(body.action as StocktakeAction)
    )
      throw new StocktakeError("Үйлдэл буруу байна");
    const action = body.action as StocktakeAction;
    if (["approve", "cancel", "reopen"].includes(action) && !canApprove)
      throw new StocktakeError(
        "Үлдэгдэл удирдах эрхтэй ажилтан энэ үйлдлийг хийнэ",
        403,
      );
    if (
      typeof body.version !== "number" ||
      !Number.isInteger(body.version) ||
      body.version < 0
    )
      throw new StocktakeError("Тооллогын хувилбар буруу байна");
    return res.json(
      await mutateStocktake({
        id: String(req.params.id),
        organizationId,
        actorId: actor.id,
        version: body.version,
        action,
        edits: action === "save" ? parseCountEdits(body.edits) : undefined,
      }),
    );
  }),
);
export default router;
