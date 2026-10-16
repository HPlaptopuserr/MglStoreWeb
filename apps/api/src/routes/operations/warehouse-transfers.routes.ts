import {
  Router,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import { prisma, Prisma } from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import { hasWarehouseAccess } from "../../services/warehouse-access.service";
import { WarehouseProductOwnershipError } from "../../services/warehouse-product-ownership";
import {
  parseTransfer,
  parseTransferAcceptance,
  TransferError,
} from "../../services/warehouse-transfer.policy";
import {
  matchingTransferProducts,
  receiveWarehouseTransfer,
  sendWarehouseTransfer,
  transferInclude,
} from "../../services/warehouse-transfer.service";

const router: ExpressRouter = Router();
const actor = (req: Request) => (req as Request & { user?: AuthPayload }).user;
async function access(req: Request, warehouseId: string) {
  if (!(await hasWarehouseAccess(actor(req), warehouseId)))
    throw new TransferError("Энэ агуулахад үйлдэл хийх эрхгүй байна", 403);
}
function handler(run: (req: Request, res: Response) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try {
      await run(req, res);
    } catch (error) {
      if (
        error instanceof TransferError ||
        error instanceof WarehouseProductOwnershipError
      ) {
        res.status(error.status).json({ message: error.message });
        return;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2002", "P2034"].includes(error.code)
      ) {
        res.status(409).json({
          message: "Бүртгэл өөрчлөгдсөн байна. Дахин ачаалаад тулгана уу.",
        });
        return;
      }
      console.error("warehouse transfer error", error);
      res.status(500).json({
        message: "Шилжүүлэг боловсруулахад алдаа гарлаа. Дахин оролдоно уу.",
      });
    }
  };
}
router.get(
  "/warehouse-transfers/inventory",
  requireAuth,
  handler(async (req, res) => {
    const sourceId =
      typeof req.query.sourceWarehouseId === "string"
        ? req.query.sourceWarehouseId
        : "";
    await access(req, sourceId);
    const warehouse = await prisma.warehouse.findFirst({
      where: { id: sourceId, type: "CENTRAL", isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (!warehouse) throw new TransferError("Идэвхтэй агуулах олдсонгүй", 404);
    res.json(
      await prisma.warehouseInventory.findMany({
        where: {
          warehouseId: sourceId,
          quantity: { gt: 0 },
          product: {
            organizationId: null,
            managedByWarehouseId: sourceId,
            deletedAt: null,
            isActive: true,
          },
        },
        select: {
          id: true,
          quantity: true,
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              barcode: true,
              barcodeAliases: true,
              price: true,
              isActive: true,
            },
          },
        },
        orderBy: [{ product: { name: "asc" } }, { id: "asc" }],
      }),
    );
  }),
);
router.get(
  "/warehouse-transfers/destinations",
  requireAuth,
  handler(async (req, res) => {
    const sourceId =
      typeof req.query.sourceWarehouseId === "string"
        ? req.query.sourceWarehouseId
        : "";
    await access(req, sourceId);
    res.json(
      await prisma.warehouse.findMany({
        where: {
          type: "CENTRAL",
          isActive: true,
          deletedAt: null,
          id: { not: sourceId },
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    );
  }),
);
router.get(
  "/warehouse-transfers",
  requireAuth,
  handler(async (req, res) => {
    const warehouseId =
      typeof req.query.warehouseId === "string" ? req.query.warehouseId : "";
    await access(req, warehouseId);
    const direction =
      req.query.direction === "outgoing"
        ? "sourceWarehouseId"
        : "destinationWarehouseId";
    const pending = req.query.status !== "RECEIVED";
    res.json(
      await prisma.warehouseTransfer.findMany({
        where: {
          [direction]: warehouseId,
          status: pending ? "SENT" : "RECEIVED",
        },
        include: transferInclude,
        orderBy: { sentAt: pending ? "asc" : "desc" },
        take: 100,
      }),
    );
  }),
);
router.get(
  "/warehouse-transfers/:id",
  requireAuth,
  handler(async (req, res) => {
    const transfer = await prisma.warehouseTransfer.findUnique({
      where: { id: req.params.id },
      include: {
        ...transferInclude,
        items: {
          include: {
            sourceProduct: {
              select: {
                price: true,
                masterProductId: true,
                barcode: true,
                sku: true,
                barcodeAliases: true,
              },
            },
          },
        },
      },
    });
    if (!transfer) throw new TransferError("Падаан олдсонгүй", 404);
    await access(req, transfer.destinationWarehouseId);
    const items = await Promise.all(
      transfer.items.map(async (row) => ({
        ...row,
        unitCost: row.unitCost ?? row.sourceProduct.price,
        matches: await matchingTransferProducts(
          prisma,
          transfer.destinationWarehouseId,
          row.sourceProduct,
        ),
      })),
    );
    res.json({ ...transfer, items });
  }),
);
router.post(
  "/warehouse-transfers",
  requireAuth,
  handler(async (req, res) => {
    const input = parseTransfer(req.body as unknown);
    await access(req, input.sourceWarehouseId);
    res
      .status(201)
      .json(await sendWarehouseTransfer(input, actor(req)!.userId));
  }),
);
router.post(
  "/warehouse-transfers/:id/receive",
  requireAuth,
  handler(async (req, res) => {
    const input = parseTransferAcceptance(req.body as unknown);
    const transfer = await prisma.warehouseTransfer.findUnique({
      where: { id: req.params.id },
      select: { destinationWarehouseId: true },
    });
    if (!transfer) throw new TransferError("Падаан олдсонгүй", 404);
    await access(req, transfer.destinationWarehouseId);
    res.json(
      await receiveWarehouseTransfer(req.params.id, input, actor(req)!.userId),
    );
  }),
);
export default router;
