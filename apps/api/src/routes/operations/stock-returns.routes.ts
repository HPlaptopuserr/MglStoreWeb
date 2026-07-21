import { Router, type Request, type Router as ExpressRouter } from "express";
import {
  InventoryReason,
  prisma,
  ReturnStatus,
  type Prisma,
} from "@mgl/database";
import { Permission } from "@mgl/types";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import { adjustStock } from "../../services/inventory.service";
import { assertOrgPermission } from "../../services/permission.service";
import { hasWarehouseAccess } from "../../services/warehouse-access.service";

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

const generateReturnNumber = async (): Promise<string> => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const prefix = `RTN-${yy}${mm}${dd}`;
  const count = await prisma.dispatchReturn.count({
    where: { returnNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
};

// ═══════════════════════════════════════════════════════════════
// DISPATCH RETURNS — Post-delivery return management
// ═══════════════════════════════════════════════════════════════

// CREATE return for a delivered dispatch
router.post("/dispatches/:id/returns", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { items, reason, note } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Буцаах бараа сонгоно уу" });
    }

    // Load dispatch with items
    const dispatch = await prisma.stockDispatch.findUnique({
      where: { id },
      include: {
        request: {
          include: { items: { include: { product: true } } },
        },
        returns: { include: { items: true } },
      },
    });

    if (!dispatch) {
      return res.status(404).json({ message: "Илгээмж олдсонгүй" });
    }
    const permissions = await assertOrgPermission(
      req,
      res,
      dispatch.organizationId,
      Permission.REQUEST_STOCK,
    );
    if (!permissions) return;
    if (dispatch.status !== "DELIVERED") {
      return res.status(400).json({
        message: "Зөвхөн хүргэгдсэн илгээмжээс буцаалт хийх боломжтой",
      });
    }

    // Validate quantities — cannot exceed delivered minus already-returned
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        return res
          .status(400)
          .json({ message: "Буцаах барааны мэдээлэл буруу" });
      }
      const dispatchItem = dispatch.request.items.find(
        (i) => i.productId === item.productId,
      );
      if (!dispatchItem) {
        return res.status(400).json({
          message: `Бүтээгдэхүүн ${item.productId} илгээмжид байхгүй`,
        });
      }
      const deliveredQty =
        dispatchItem.approvedQuantity || dispatchItem.quantity;
      // Sum previously approved/pending returns for this product
      const alreadyReturned = dispatch.returns
        .filter((r) => r.status !== "REJECTED")
        .reduce((sum, r) => {
          const ri = r.items.find((ri) => ri.productId === item.productId);
          return sum + (ri?.quantity || 0);
        }, 0);
      if (item.quantity > deliveredQty - alreadyReturned) {
        return res.status(400).json({
          message: `${dispatchItem.product.name}: хүргэгдсэн ${deliveredQty}, аль хэдийн буцаасан ${alreadyReturned}, буцаах боломжтой ${deliveredQty - alreadyReturned}`,
        });
      }
    }

    const returnNumber = await generateReturnNumber();

    const dispatchReturn = await prisma.dispatchReturn.create({
      data: {
        returnNumber,
        dispatchId: dispatch.id,
        warehouseId: dispatch.warehouseId,
        organizationId: dispatch.organizationId,
        reason: reason || null,
        note: note || null,
        items: {
          create: items.map(
            (item: {
              productId: string;
              quantity: number;
              reason?: string;
            }) => ({
              productId: item.productId,
              quantity: item.quantity,
              reason: item.reason || null,
            }),
          ),
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, price: true },
            },
          },
        },
        dispatch: { select: { dispatchNumber: true } },
        organization: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(dispatchReturn);
  } catch (error) {
    console.error("create dispatch return error", error);
    res.status(500).json({ message: "Буцаалт үүсгэхэд алдаа гарлаа" });
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
        dispatch: true,
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

    // Restore inventory inside a transaction
    const updated = await prisma.$transaction(async (tx) => {
      for (const item of dispatchReturn.items) {
        await adjustStock(tx, {
          productId: item.productId,
          warehouseId: dispatchReturn.warehouseId,
          change: item.quantity, // positive = return to stock
          reason: InventoryReason.RETURN,
          note: `Буцаалт ${dispatchReturn.returnNumber}`,
          createdById: actor?.userId || null,
          referenceId: dispatchReturn.returnNumber,
          referenceType: "DISPATCH_RETURN",
        });
      }

      return tx.dispatchReturn.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
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
          warehouse: { select: { id: true, name: true } },
        },
      });
    });

    res.json(updated);
  } catch (error) {
    console.error("approve dispatch return error", error);
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

    const updated = await prisma.dispatchReturn.update({
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

    res.json(updated);
  } catch (error) {
    console.error("reject dispatch return error", error);
    res.status(500).json({ message: "Буцаалт татгалзахад алдаа гарлаа" });
  }
});

export default router;
