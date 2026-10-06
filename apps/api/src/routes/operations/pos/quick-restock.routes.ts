import { Router, type Router as ExpressRouter } from "express";
import { prisma, InventoryReason } from "@mgl/database";
import { normalizePosMeasureUnit, fromPosStoredStockQuantity } from "@mgl/types";
import { requirePosUser, canAccessPosOrganization } from "./_shared";
import { adjustStock } from "../../../services/inventory.service";
import { StocktakeError } from "../../../services/stocktake.policy";

const router: ExpressRouter = Router();
router.post("/pos/quick-restock", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    const { requestId, registerId, productId, quantity } = req.body ?? {};
    if (typeof requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId) ||
        typeof registerId !== "string" || typeof productId !== "string" ||
        typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1000000)
      return res.status(400).json({ message: "Касс, бараа, нэмэх тоо хэмжээгээ шалгана уу" });
    const register = await prisma.posRegister.findFirst({ where: { id: registerId, isActive: true, deletedAt: null } });
    if (!register || !canAccessPosOrganization(actor, register.organizationId))
      return res.status(403).json({ message: "Энэ кассаар орлого бүртгэх эрхгүй байна" });
    const result = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${register.organizationId}))`;
      await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" = ${productId} AND "organizationId" = ${register.organizationId} FOR UPDATE`;
      const product = await tx.product.findFirst({ where: { id: productId, organizationId: register.organizationId, deletedAt: null, isActive: true, supplyType: "IN_STOCK", isRestaurantMenuItem: false } });
      if (!product) throw new StocktakeError("Бараа олдсонгүй эсвэл орлого авах боломжгүй", 404);
      const scaled = quantity * (normalizePosMeasureUnit(product.unit) === "kg" ? 1000 : 1);
      if (Math.round(scaled) < 1 || Math.abs(scaled - Math.round(scaled)) > 0.000001 || scaled > 2147483647)
        throw new StocktakeError("Ширхэг бүхэл, кг 3 хүртэл орны нарийвчлалтай байна");
      const amount = Math.round(scaled);
      const existing = await tx.posGoodsReceipt.findUnique({ where: { id: requestId }, include: { items: true } });
      if (existing) {
        if (existing.registerId !== registerId || existing.receivedById !== actor.id ||
          existing.items.length !== 1 || existing.items[0]!.productId !== productId ||
          existing.items[0]!.quantity !== amount)
          throw new StocktakeError("Хүсэлтийн дугаар өөр орлогод ашиглагдсан байна", 409);
        return { receiptNo: existing.receiptNo, stockQty: fromPosStoredStockQuantity(product.stock, product.unit) };
      }
      if (product.stock + amount > 2147483647) throw new StocktakeError("Үлдэгдлийн хязгаар хэтэрсэн");
      const receiptNo = `POS-RESTOCK-${requestId}`;
      await tx.posGoodsReceipt.create({ data: {
        id: requestId, receiptNo, organizationId: register.organizationId, branchId: register.branchId,
        registerId, receivedById: actor.id, supplierName: "POS түргэн орлого",
        note: "Борлуулалтын үеэр нөөц нөхсөн",
        items: { create: { productId, quantity: amount, remainingQuantity: amount, unitCost: product.costPrice } },
      } });
      const inventories = await tx.warehouseInventory.findMany({ where: { productId }, select: { warehouseId: true, warehouse: { select: { type: true, isActive: true, deletedAt: true, organizations: { where: { organizationId: register.organizationId }, select: { organizationId: true } } } } }, take: 2 });
      if (inventories.length > 1 || inventories.some(row => row.warehouse.type !== "VENDOR_INTERNAL" || !row.warehouse.isActive || row.warehouse.deletedAt || !row.warehouse.organizations.length))
        throw new StocktakeError("Агуулахын орлого хэсгээс нөөцлөх агуулахаа сонгоно уу", 409);
      const warehouseId = inventories[0]?.warehouseId;
      await adjustStock(tx, { productId, warehouseId: warehouseId || undefined, change: amount,
        reason: InventoryReason.RESTOCK, note: "POS түргэн орлого", createdById: actor.id,
        referenceId: receiptNo, referenceType: "POS_GOODS_RECEIPT" });
      const updated = await tx.product.findUniqueOrThrow({ where: { id: productId }, select: { stock: true } });
      return { receiptNo, stockQty: fromPosStoredStockQuantity(updated.stock, product.unit) };
    }, { timeout: 30000 });
    return res.json(result);
  } catch (error) {
    if (error instanceof StocktakeError) return res.status(error.status).json({ message: error.message });
    console.error("[POS quick restock]", error);
    return res.status(500).json({ message: "Орлого бүртгэж чадсангүй. Дахин оролдоно уу." });
  }
});
export default router;
