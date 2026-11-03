import {
  Router,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import { ManualDispatchError } from "../../services/warehouse-manual-dispatch.policy";
import { WarehouseViewerError } from "../../services/warehouse-viewer.policy";
import { WarehouseProductOwnershipError } from "../../services/warehouse-product-ownership";
import {
  createManualDispatch,
  getManualDispatch,
  listManualDispatches,
} from "../../services/warehouse-manual-dispatch.service";

const router: ExpressRouter = Router();
const actor = (req: Request) => (req as Request & { user: AuthPayload }).user;
const handle =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "private, no-store");
    try {
      await fn(req, res);
    } catch (error) {
      if (
        error instanceof ManualDispatchError ||
        error instanceof WarehouseViewerError ||
        error instanceof WarehouseProductOwnershipError
      )
        return res
          .status(error.status)
          .json({
            message: error.message,
            ...(error instanceof ManualDispatchError && error.productId
              ? { productId: error.productId }
              : {}),
          });
      console.error("[warehouse-manual-dispatch]", error);
      return res
        .status(500)
        .json({
          message:
            "Паданы мэдээллийг боловсруулж чадсангүй. Дахин оролдоно уу.",
        });
    }
  };
const path = "/warehouses/:warehouseId/manual-dispatches";
router.get(
  path,
  requireAuth,
  handle(async (req, res) =>
    res.json(
      await listManualDispatches(
        actor(req),
        String(req.params.warehouseId),
        req.query,
      ),
    ),
  ),
);
router.get(
  `${path}/:id`,
  requireAuth,
  handle(async (req, res) =>
    res.json(
      await getManualDispatch(
        actor(req),
        String(req.params.warehouseId),
        String(req.params.id),
      ),
    ),
  ),
);
router.post(
  path,
  requireAuth,
  handle(async (req, res) =>
    res
      .status(201)
      .json(
        await createManualDispatch(
          actor(req),
          String(req.params.warehouseId),
          req.body,
        ),
      ),
  ),
);
export default router;
