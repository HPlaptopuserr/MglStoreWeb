import { readCafeProductHistory } from "../../services/product-cafe-history.service";
import { Router, type Request, type Router as ExpressRouter } from "express";
import { prisma } from "@mgl/database";
import { Permission, fromPosStoredStockQuantity } from "@mgl/types";
import { requireAuth, type AuthPayload } from "../../middleware/auth";
import { hasWarehouseAccess } from "../../services/warehouse-access.service";
import { resolvePermissionsForOrg } from "../../services/permission.service";

const router: ExpressRouter = Router();
// Read-only and intentionally independent of transfer migrations and stock mutation code.
router.get(
  "/product-history/:productId",
  requireAuth,
  async (req: Request, res) => {
    try {
      const actor = (req as Request & { user: AuthPayload }).user;
      const product = await prisma.product.findUnique({
        where: { id: String(req.params.productId) },
        select: {
          id: true,
          name: true,
          organizationId: true,
          managedByWarehouseId: true,
          submittedById: true,
          createdAt: true,
          unit: true,
        },
      });
      if (!product) return res.status(404).json({ message: "Бараа олдсонгүй" });
      let allowed = false;
      if (product.managedByWarehouseId && !product.organizationId) {
        allowed = await hasWarehouseAccess(actor, product.managedByWarehouseId);
      } else if (product.organizationId && !product.managedByWarehouseId) {
        const { permissions } = await resolvePermissionsForOrg(
          actor.userId,
          actor.role,
          product.organizationId,
        );
        allowed = [
          Permission.MANAGE_PRODUCTS,
          Permission.MANAGE_STOCK,
          Permission.MANAGE_POS,
          Permission.OPERATE_POS,
        ].some((p) => permissions.has(p));
      }
      if (!allowed)
        return res
          .status(403)
          .json({ message: "Барааны түүх харах эрхгүй байна" });
      const cursor =
        typeof req.query.cursor === "string" ? req.query.cursor : undefined;
      const registrationUser = product.submittedById
        ? await prisma.user.findUnique({
            where: { id: product.submittedById },
            select: { profile: { select: { fullName: true } } },
          })
        : null;
      const registration = {
        createdAt: product.createdAt,
        userName: registrationUser?.profile?.fullName ?? null,
        menu: null,
      };
      res.setHeader("Cache-Control", "private, no-store");
      if (req.query.stream === "cafe" && product.organizationId) {
        const history = await readCafeProductHistory(
          product.id,
          product.organizationId,
          cursor,
        );
        if (!history)
          return res
            .status(400)
            .json({ message: "Хуудасны заалт буруу байна" });
        return res.json({
          ...history,
          registration,
          hasCafeHistory: true,
          summary: { ...history.summary, unit: product.unit },
        });
      }
      if (
        cursor &&
        !(await prisma.inventoryLedger.findFirst({
          where: { id: cursor, productId: product.id },
          select: { id: true },
        }))
      ) {
        return res.status(400).json({ message: "Хуудасны заалт буруу байна" });
      }
      const [entries, arrivals] = await Promise.all([
        prisma.inventoryLedger.findMany({
          where: { productId: product.id },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 31,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          include: {
            createdBy: { select: { profile: { select: { fullName: true } } } },
            warehouse: { select: { name: true } },
          },
        }),
        prisma.inventoryLedger.groupBy({
          by: ["referenceType", "referenceId"],
          where: {
            productId: product.id,
            change: { gt: 0 },
            reason: { in: ["RESTOCK", "TRANSFER_IN"] },
            referenceId: { not: null },
          },
          _min: { createdAt: true },
          _sum: { change: true },
        }),
      ]);
      const page = entries.slice(0, 30);
      const warehouseIds = page
        .filter((e) => e.referenceType === "WAREHOUSE_GOODS_RECEIPT")
        .flatMap((e) => (e.referenceId ? [e.referenceId] : []));
      const posIds = page
        .filter((e) => e.referenceType === "POS_GOODS_RECEIPT")
        .flatMap((e) => (e.referenceId ? [e.referenceId] : []));
      const [warehouseReceipts, posReceipts] = await Promise.all([
        warehouseIds.length
          ? prisma.warehouseGoodsReceipt.findMany({
              where: {
                id: { in: warehouseIds },
                items: { some: { productId: product.id } },
              },
              select: {
                id: true,
                receiptNumber: true,
                supplierName: true,
                status: true,
              },
            })
          : [],
        posIds.length
          ? prisma.posGoodsReceipt.findMany({
              where: {
                id: { in: posIds },
                organizationId: product.organizationId ?? "",
                items: { some: { productId: product.id } },
              },
              select: { id: true, receiptNo: true, supplierName: true },
            })
          : [],
      ]);
      const dates = arrivals
        .flatMap((a) => (a._min.createdAt ? [a._min.createdAt.getTime()] : []))
        .sort((a, b) => a - b);
      const quantity = (value: number) =>
        product.organizationId
          ? Math.sign(value) *
            fromPosStoredStockQuantity(Math.abs(value), product.unit)
          : value;
      res.setHeader("Cache-Control", "private, no-store");
      return res.json({
        registration,
        hasCafeHistory: !!product.organizationId,
        summary: {
          arrivalCount: dates.length,
          averageDays:
            dates.length > 1
              ? (dates[dates.length - 1] - dates[0]) /
                86400000 /
                (dates.length - 1)
              : null,
          totalReceived: quantity(
            arrivals.reduce((sum, a) => sum + (a._sum.change ?? 0), 0),
          ),
          unit: product.unit,
        },
        entries: page.map((entry) => {
          const warehouseReceipt = warehouseReceipts.find(
            (r) => r.id === entry.referenceId,
          );
          const posReceipt = posReceipts.find(
            (r) => r.id === entry.referenceId,
          );
          return {
            id: entry.id,
            date: entry.createdAt,
            quantity: quantity(entry.change),
            reason: entry.reason,
            note: entry.note,
            userName: entry.createdBy?.profile?.fullName ?? null,
            warehouse: entry.warehouse?.name ?? null,
            source:
              warehouseReceipt?.supplierName ??
              posReceipt?.supplierName ??
              null,
            document:
              warehouseReceipt?.receiptNumber ??
              posReceipt?.receiptNo ??
              entry.referenceId,
            referenceType: entry.referenceType,
            cancelled: warehouseReceipt?.status === "CANCELLED",
          };
        }),
        nextCursor: entries.length > 30 ? page[page.length - 1].id : null,
      });
    } catch (error) {
      console.error("product history read failed", error);
      return res
        .status(500)
        .json({ message: "Түүх ачаалж чадсангүй. Дахин оролдоно уу." });
    }
  },
);
export default router;
