import crypto from "node:crypto";
import { Router, type Router as ExpressRouter } from "express";
import { InventoryReason, prisma } from "@mgl/database";
import {
  adjustStock,
  resolveOrgWarehouse,
} from "../../../services/inventory.service";
import { canAccessPosOrganization, requirePosUser } from "./_shared";
import { parsePosGoodsReceiptInput } from "./goods-receipt";
import { fromPosStoredStockQuantity } from "@mgl/types";

const router: ExpressRouter = Router();

router.get("/pos/goods-receipts", async (req, res) => {
  try {
    const actor = await requirePosUser(req, res);
    if (!actor) return;
    const registerId = String(req.query.registerId ?? "").trim();
    if (!registerId)
      return res.status(400).json({ message: "POS касс сонгоно уу" });

    const register = await prisma.posRegister.findFirst({
      where: { id: registerId, deletedAt: null },
      select: { organizationId: true },
    });
    if (!register)
      return res.status(404).json({ message: "POS касс олдсонгүй" });
    if (!canAccessPosOrganization(actor, register.organizationId)) {
      return res
        .status(403)
        .json({ message: "Баримтын жагсаалт харах эрхгүй байна" });
    }

    const receipts = await prisma.posGoodsReceipt.findMany({
      where: { registerId },
      orderBy: { receivedAt: "desc" },
      take: 50,
      select: {
        id: true,
        receiptNo: true,
        supplierName: true,
        supplierRegisterNo: true,
        documentNo: true,
        note: true,
        receivedAt: true,
        branch: { select: { name: true } },
        register: { select: { name: true } },
        receivedBy: {
          select: { email: true, profile: { select: { fullName: true } } },
        },
        items: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            quantity: true,
            remainingQuantity: true,
            unitCost: true,
            batchNumber: true,
            expiryDate: true,
            product: {
              select: { name: true, sku: true, barcode: true, unit: true },
            },
          },
        },
      },
    });

    return res.json(
      receipts.map((receipt) => {
        const items = receipt.items.map((item) => {
          const quantity = fromPosStoredStockQuantity(
            item.quantity,
            item.product.unit,
          );
          const remainingQuantity = fromPosStoredStockQuantity(
            item.remainingQuantity,
            item.product.unit,
          );
          const unitCost = item.unitCost == null ? null : Number(item.unitCost);
          return {
            id: item.id,
            productName: item.product.name,
            sku: item.product.sku,
            barcode: item.product.barcode,
            unit: item.product.unit,
            quantity,
            remainingQuantity,
            unitCost,
            totalCost: unitCost == null ? null : unitCost * quantity,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate?.toISOString().slice(0, 10) ?? null,
          };
        });
        return {
          id: receipt.id,
          receiptNo: receipt.receiptNo,
          supplierName: receipt.supplierName,
          supplierRegisterNo: receipt.supplierRegisterNo,
          documentNo: receipt.documentNo,
          note: receipt.note,
          receivedAt: receipt.receivedAt.toISOString(),
          branchName: receipt.branch.name,
          registerName: receipt.register.name,
          receivedBy:
            receipt.receivedBy.profile?.fullName ?? receipt.receivedBy.email,
          totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
          totalCost: items.reduce(
            (sum, item) => sum + (item.totalCost ?? 0),
            0,
          ),
          items,
        };
      }),
    );
  } catch (error) {
    console.error("POS goods receipt list error", error);
    return res
      .status(500)
      .json({ message: "Хүлээн авалтын баримтуудыг авахад алдаа гарлаа" });
  }
});

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

    if (!canAccessPosOrganization(actor, register.organizationId)) {
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
      select: { id: true, name: true, sku: true, barcode: true, unit: true },
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
              unitCost: item.unitCost,
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
          quantity: fromPosStoredStockQuantity(item.quantity, product.unit),
          unitCost: item.unitCost,
          totalCost:
            item.unitCost *
            fromPosStoredStockQuantity(item.quantity, product.unit),
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate?.toISOString().slice(0, 10) || null,
          stockQty: fromPosStoredStockQuantity(
            stockByProduct.get(item.productId) || 0,
            product.unit,
          ),
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
