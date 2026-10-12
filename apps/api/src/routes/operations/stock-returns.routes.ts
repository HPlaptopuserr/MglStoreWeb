import { Router, type Request, type Router as ExpressRouter } from "express";
import { prisma, ReturnStatus, type Prisma } from "@mgl/database";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import {
  approveDispatchReturn,
  createDispatchReturn,
  DispatchReturnConflictError,
  type DispatchReturnLineInput,
} from "../../services/dispatch-return.service";
import { StockTransferConflictError } from "../../services/stock-transfer.service";
import { ProductInventoryConflictError } from "../../services/vendor-inventory-warehouse.service";
import { hasWarehouseAccess } from "../../services/warehouse-access.service";
import { canCreateUnpaidDispatchReturn } from "../../services/dispatch-return.policy";

const router: ExpressRouter = Router();

function getActor(req: Request) {
  return (req as Request & { user?: AuthPayload }).user;
}

async function assertWarehouseAccess(
  req: Request,
  res: Parameters<typeof requireAuth>[1],
  warehouseId: string,
) {
  if (!(await hasWarehouseAccess(getActor(req), warehouseId))) {
    res.status(403).json({ message: "Энэ агуулахад хандах эрхгүй байна" });
    return false;
  }
  return true;
}

// CREATE return for a delivered dispatch. Availability is checked under its lock.
router.post("/dispatches/:id/returns", requireAuth, async (req, res) => {
  try {
    const rawItems: unknown = req.body.items;
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ message: "Буцаах бараа сонгоно уу" });
    }
    const items: DispatchReturnLineInput[] = [];
    for (const item of rawItems as unknown[]) {
      if (
        typeof item !== "object" ||
        item === null ||
        !("productId" in item) ||
        typeof item.productId !== "string" ||
        !("quantity" in item) ||
        typeof item.quantity !== "number" ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1
      ) {
        return res
          .status(400)
          .json({ message: "Буцаах барааны мэдээлэл буруу" });
      }
      items.push({
        productId: item.productId,
        quantity: item.quantity,
        ...("reason" in item && typeof item.reason === "string"
          ? { reason: item.reason }
          : {}),
      });
    }
    const dispatch = await prisma.stockDispatch.findUnique({
      where: { id: req.params.id },
      select: { id: true, warehouseId: true },
    });
    if (!dispatch)
      return res.status(404).json({ message: "Илгээмж олдсонгүй" });
    if (!(await assertWarehouseAccess(req, res, dispatch.warehouseId))) return;
    const created = await prisma.$transaction((tx) =>
      createDispatchReturn(tx, dispatch.id, {
        items,
        ...(typeof req.body.reason === "string"
          ? { reason: req.body.reason }
          : {}),
        ...(typeof req.body.note === "string" ? { note: req.body.note } : {}),
      }),
    );
    return res.status(201).json(created);
  } catch (error) {
    if (error instanceof DispatchReturnConflictError)
      return res.status(409).json({ message: error.message });
    if (error instanceof Error && error.message === "RETURN_PAYMENT_RECEIVED") {
      return res
        .status(409)
        .json({
          code: "DISPATCH_RETURN_PAYMENT_RECEIVED",
          message: "Төлбөр орсон тул буцаалт үүсгэх боломжгүй",
        });
    }
    console.error("create dispatch return error", error);
    return res.status(500).json({ message: "Буцаалт үүсгэхэд алдаа гарлаа" });
  }
});

// LIST returns for a warehouse
router.get("/warehouse/:warehouseId/returns", requireAuth, async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const { status } = req.query;
    if (!(await assertWarehouseAccess(req, res, warehouseId))) return;

    const where: Prisma.DispatchReturnWhereInput = { warehouseId };
    if (status && typeof status === "string") {
      where.status = status as ReturnStatus;
    }

    const returns = await prisma.dispatchReturn.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, price: true },
            },
          },
        },
        dispatch: {
          select: {
            dispatchNumber: true,
            driverName: true,
            driverPhone: true,
            vehicleNumber: true,
            request: {
              select: {
                requestNumber: true,
                deliveryAddress: true,
                organization: { select: { id: true, name: true, phone: true } },
                requestedBy: {
                  select: {
                    id: true,
                    email: true,
                    profile: { select: { fullName: true, phoneNumber: true } },
                  },
                },
              },
            },
          },
        },
        organization: { select: { id: true, name: true, phone: true } },
        warehouse: { select: { id: true, name: true } },
        approvedBy: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(returns);
  } catch (error) {
    console.error("list warehouse returns error", error);
    res.status(500).json({ message: "Буцаалтын жагсаалт авахад алдаа гарлаа" });
  }
});

// GET returns for a specific dispatch
router.get("/dispatches/:id/returns", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const dispatch = await prisma.stockDispatch.findUnique({
      where: { id },
      select: { warehouseId: true },
    });
    if (!dispatch) {
      return res.status(404).json({ message: "Илгээмж олдсонгүй" });
    }
    if (!(await assertWarehouseAccess(req, res, dispatch.warehouseId))) return;
    const returns = await prisma.dispatchReturn.findMany({
      where: { dispatchId: id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, price: true },
            },
          },
        },
        approvedBy: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(returns);
  } catch (error) {
    console.error("list dispatch returns error", error);
    res.status(500).json({ message: "Буцаалтын жагсаалт авахад алдаа гарлаа" });
  }
});

// APPROVE return — restores inventory to warehouse
router.patch("/returns/:id/approve", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const actor = getActor(req);

    const dispatchReturn = await prisma.dispatchReturn.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        dispatch: {
          include: {
            request: {
              select: {
                organizationId: true,
                payment: { select: { paidAmount: true, status: true } },
              },
            },
          },
        },
      },
    });

    if (!dispatchReturn) {
      return res.status(404).json({ message: "Буцаалт олдсонгүй" });
    }
    if (!(await assertWarehouseAccess(req, res, dispatchReturn.warehouseId))) {
      return;
    }
    if (dispatchReturn.status !== "PENDING") {
      return res
        .status(400)
        .json({ message: "Зөвхөн хүлээгдэж буй буцаалтыг батлах боломжтой" });
    }
    if (
      !canCreateUnpaidDispatchReturn(dispatchReturn.dispatch.request.payment)
    ) {
      return res.status(409).json({
        code: "DISPATCH_RETURN_PAYMENT_RECEIVED",
        message: "Буцаалт үүссэнээс хойш төлбөр орсон тул батлах боломжгүй",
      });
    }

    const updated = await prisma.$transaction((tx) =>
      approveDispatchReturn(tx, id, actor?.userId ?? null),
    );

    res.json(updated);
  } catch (error) {
    console.error("approve dispatch return error", error);
    if (
      error instanceof DispatchReturnConflictError ||
      error instanceof StockTransferConflictError ||
      error instanceof ProductInventoryConflictError
    ) {
      return res.status(409).json({ message: error.message });
    }
    if (error instanceof Error && error.message === "RETURN_PAYMENT_RECEIVED") {
      return res.status(409).json({
        code: "DISPATCH_RETURN_PAYMENT_RECEIVED",
        message: "Төлбөр орсон тул буцаалтыг батлах боломжгүй",
      });
    }
    if (
      error instanceof Error &&
      error.message.startsWith("VENDOR_STOCK_INSUFFICIENT:")
    ) {
      return res.status(409).json({
        code: "RETURN_VENDOR_STOCK_INSUFFICIENT",
        message: `${error.message.split(":").slice(1).join(":")}: дэлгүүрийн үлдэгдэл хүрэлцэхгүй байна`,
      });
    }
    res.status(500).json({ message: "Буцаалт батлахад алдаа гарлаа" });
  }
});

// REJECT return
router.patch("/returns/:id/reject", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectReason } = req.body;
    const actor = getActor(req);

    const dispatchReturn = await prisma.dispatchReturn.findUnique({
      where: { id },
    });

    if (!dispatchReturn) {
      return res.status(404).json({ message: "Буцаалт олдсонгүй" });
    }
    if (!(await assertWarehouseAccess(req, res, dispatchReturn.warehouseId))) {
      return;
    }
    if (dispatchReturn.status !== "PENDING") {
      return res.status(400).json({
        message: "Зөвхөн хүлээгдэж буй буцаалтыг татгалзах боломжтой",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "DispatchReturn" WHERE "id" = ${id} FOR UPDATE`;
      const current = await tx.dispatchReturn.findUniqueOrThrow({
        where: { id },
      });
      if (current.status !== "PENDING")
        throw new DispatchReturnConflictError(
          "Буцаалтын төлөв өөрчлөгдсөн байна",
        );
      return tx.dispatchReturn.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectedAt: new Date(),
          rejectReason: rejectReason || null,
          approvedById: actor?.userId || null,
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, price: true },
              },
            },
          },
          organization: { select: { id: true, name: true } },
        },
      });
    });

    res.json(updated);
  } catch (error) {
    console.error("reject dispatch return error", error);
    if (error instanceof DispatchReturnConflictError)
      return res.status(409).json({ message: error.message });
    res.status(500).json({ message: "Буцаалт татгалзахад алдаа гарлаа" });
  }
});

export default router;
