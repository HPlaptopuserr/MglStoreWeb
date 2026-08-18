import crypto from "node:crypto";
import { Router, type Router as ExpressRouter } from "express";
import { InventoryReason, prisma } from "@mgl/database";
import {
  adjustStock,
  resolveOrgWarehouse,
} from "../../../services/inventory.service";
import { hasOrgMembership } from "../../../services/permission.service";
import { requirePosUser } from "./_shared";
import { parsePosGoodsReceiptInput } from "./goods-receipt";

const router: ExpressRouter = Router();

router.post("/pos/goods-receipts", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;

    const parsed = parsePosGoodsReceiptInput(req.body);
    if (!parsed.ok) {
      return res.status(400).json({ message: parsed.message });
    }
    const input = parsed.value;

    const register = await prisma.posRegister.findUnique({
      where: { id: input.registerId },
      select: {
        id: true,
        name: true,
        organizationId: true,
        branchId: true,
        isActive: true,
        deletedAt: true,
        branch: { select: { name: true } },
      },
    });
    if (!register || register.deletedAt) {
      return res.status(404).json({ message: "POS касс олдсонгүй" });
    }
    if (!register.isActive) {
      return res.status(409).json({ message: "POS касс идэвхгүй байна" });
    }

    if (
      actor.role !== "ADMIN" &&
      actor.role !== "SUPER_ADMIN" &&
      !(await hasOrgMembership(actor.id, register.organizationId))
    ) {
      return res
        .status(403)
        .json({ message: "Энэ кассаар бараа хүлээн авах эрхгүй байна" });
    }

    const productIds = Array.from(
      new Set(input.items.map((item) => item.productId)),
    );
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        organizationId: register.organizationId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true, name: true, sku: true, barcode: true },
    });
    if (products.length !== productIds.length) {
      return res.status(400).json({
        message:
          "Зарим бараа энэ кассын байгууллагад бүртгэлгүй эсвэл идэвхгүй байна",
      });
    }

    const productById = new Map(
      products.map((product) => [product.id, product]),
    );
    const receiptId = crypto.randomUUID();
    const receivedAt = new Date();
    const receiptNo = `PGR-${receivedAt
      .toISOString()
      .slice(0, 10)
      .replaceAll(
        "-",
        "",
      )}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const referenceLabel = input.documentNo || receiptNo;
    const detailParts = [
      `POS бараа хүлээн авалт ${referenceLabel}`,
      `Нийлүүлэгч: ${input.supplierName}`,
      input.supplierRegisterNo
        ? `Регистр/ТТД: ${input.supplierRegisterNo}`
        : null,
      input.note,
    ].filter((part): part is string => Boolean(part));
    const ledgerNote = detailParts.join(" · ");

    const updatedProducts = await prisma.$transaction(
      async (tx) => {
        await tx.posGoodsReceipt.create({
          data: {
            id: receiptId,
            receiptNo,
            organizationId: register.organizationId,
            branchId: register.branchId,
            registerId: register.id,
            receivedById: actor.id,
            supplierName: input.supplierName,
            supplierRegisterNo: input.supplierRegisterNo,
            documentNo: input.documentNo,
            note: input.note,
            receivedAt,
          },
        });

        for (const item of input.items) {
          await tx.posGoodsReceiptItem.create({
            data: {
              receiptId,
              productId: item.productId,
              quantity: item.quantity,
              remainingQuantity: item.quantity,
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate,
            },
          });

          const warehouseId = await resolveOrgWarehouse(
            tx,
            register.organizationId,
            item.productId,
          );
          await adjustStock(tx, {
            productId: item.productId,
            warehouseId: warehouseId || undefined,
            change: item.quantity,
            reason: InventoryReason.RESTOCK,
            note: ledgerNote,
            createdById: actor.id,
            referenceId: receiptNo,
            referenceType: "POS_GOODS_RECEIPT",
          });
        }

        return tx.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, stock: true },
        });
      },
      { timeout: 30_000 },
    );

    const stockByProduct = new Map(
      updatedProducts.map((product) => [product.id, product.stock]),
    );
    const totalQuantity = input.items.reduce(
      (total, item) => total + item.quantity,
      0,
    );

    return res.status(201).json({
      id: receiptId,
      referenceNo: receiptNo,
      receivedAt: receivedAt.toISOString(),
      supplierName: input.supplierName,
      supplierRegisterNo: input.supplierRegisterNo,
      documentNo: input.documentNo,
      note: input.note,
      register: {
        id: register.id,
        name: register.name,
        branchId: register.branchId,
        branchName: register.branch.name,
      },
      totalItems: input.items.length,
      totalQuantity,
      items: input.items.map((item) => {
        const product = productById.get(item.productId)!;
        return {
          productId: item.productId,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          quantity: item.quantity,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate?.toISOString().slice(0, 10) || null,
          stockQty: stockByProduct.get(item.productId) || 0,
        };
      }),
    });
  } catch (error) {
    console.error("POS goods receipt error", error);
    return res
      .status(500)
      .json({ message: "POS бараа хүлээн авахад алдаа гарлаа" });
  }
});

export default router;
