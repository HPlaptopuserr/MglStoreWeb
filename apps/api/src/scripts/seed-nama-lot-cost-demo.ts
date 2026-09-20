import path from "node:path";
import dotenv from "dotenv";
import { InventoryReason, prisma } from "@mgl/database";
import {
  adjustStock,
  resolveOrgWarehouse,
} from "../services/inventory.service";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config();

const DEMO_RECEIPTS = [
  {
    receiptNo: "PGR-NAMA-LOT-COST-001",
    documentNo: "MOCK-NAMA-001",
    batchNumber: "NAMA-COLA-LOT-3000",
    quantity: 10,
    unitCost: 3_000,
    receivedDaysAgo: 10,
    expiresInDays: 60,
  },
  {
    receiptNo: "PGR-NAMA-LOT-COST-002",
    documentNo: "MOCK-NAMA-002",
    batchNumber: "NAMA-COLA-LOT-3200",
    quantity: 20,
    unitCost: 3_200,
    receivedDaysAgo: 0,
    expiresInDays: 90,
  },
] as const;

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

async function main() {
  const organization = await prisma.organization.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { name: { equals: "nama", mode: "insensitive" } },
        { slug: { equals: "nama", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true },
  });
  if (!organization) throw new Error('"nama" байгууллага олдсонгүй.');

  const register = await prisma.posRegister.findFirst({
    where: {
      organizationId: organization.id,
      isActive: true,
      deletedAt: null,
      branch: { deletedAt: null },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      branchId: true,
      branch: { select: { name: true } },
    },
  });
  if (!register) throw new Error('"nama" байгууллагад идэвхтэй POS касс алга.');

  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId: organization.id,
      deletedAt: null,
      user: { isActive: true, deletedAt: null },
    },
    orderBy: { createdAt: "asc" },
    select: {
      userId: true,
      user: {
        select: {
          email: true,
          profile: { select: { fullName: true } },
        },
      },
    },
  });
  if (!member) throw new Error('"nama" байгууллагад идэвхтэй ажилтан алга.');

  const product = await prisma.product.findFirst({
    where: {
      organizationId: organization.id,
      isActive: true,
      deletedAt: null,
      unit: { in: ["pcs", "ш", "ширхэг"] },
      OR: [
        { name: { contains: "cola", mode: "insensitive" } },
        { name: { contains: "кола", mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, sku: true, barcode: true, unit: true },
  });
  const fallbackProduct = product
    ? null
    : await prisma.product.findFirst({
        where: {
          organizationId: organization.id,
          isActive: true,
          deletedAt: null,
          unit: { in: ["pcs", "ш", "ширхэг"] },
        },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, sku: true, barcode: true, unit: true },
      });
  const selectedProduct = product ?? fallbackProduct;
  if (!selectedProduct) {
    throw new Error(
      '"nama" байгууллагад ширхгээр бүртгэсэн идэвхтэй бараа алга.',
    );
  }

  const createdReceipts: Array<{
    receiptNo: string;
    batchNumber: string;
    quantity: number;
    unitCost: number;
    expiryDate: string;
  }> = [];
  const existingReceipts: string[] = [];
  const today = new Date();

  for (const demo of DEMO_RECEIPTS) {
    const existing = await prisma.posGoodsReceipt.findUnique({
      where: { receiptNo: demo.receiptNo },
      select: { id: true },
    });
    if (existing) {
      existingReceipts.push(demo.receiptNo);
      continue;
    }

    const receivedAt = addDays(today, -demo.receivedDaysAgo);
    const expiryDate = addDays(today, demo.expiresInDays);

    await prisma.$transaction(async (tx) => {
      await tx.posGoodsReceipt.create({
        data: {
          receiptNo: demo.receiptNo,
          organizationId: organization.id,
          branchId: register.branchId,
          registerId: register.id,
          receivedById: member.userId,
          supplierName: "Mock Cola Supplier LLC",
          supplierRegisterNo: "MOCK-9911223",
          documentNo: demo.documentNo,
          note: "Партын ялгаатай авсан үнийн тест өгөгдөл",
          receivedAt,
          createdAt: receivedAt,
          items: {
            create: {
              productId: selectedProduct.id,
              quantity: demo.quantity,
              remainingQuantity: demo.quantity,
              unitCost: demo.unitCost,
              batchNumber: demo.batchNumber,
              expiryDate,
              createdAt: receivedAt,
            },
          },
        },
      });

      const warehouseId = await resolveOrgWarehouse(
        tx,
        organization.id,
        selectedProduct.id,
      );
      await adjustStock(tx, {
        productId: selectedProduct.id,
        warehouseId: warehouseId ?? undefined,
        change: demo.quantity,
        reason: InventoryReason.RESTOCK,
        note: `Mock партын хүлээн авалт ${demo.receiptNo}`,
        createdById: member.userId,
        referenceId: demo.receiptNo,
        referenceType: "POS_GOODS_RECEIPT",
      });
    });

    createdReceipts.push({
      receiptNo: demo.receiptNo,
      batchNumber: demo.batchNumber,
      quantity: demo.quantity,
      unitCost: demo.unitCost,
      expiryDate: expiryDate.toISOString().slice(0, 10),
    });
  }

  const lots = await prisma.posGoodsReceiptItem.findMany({
    where: {
      productId: selectedProduct.id,
      receipt: {
        receiptNo: { in: DEMO_RECEIPTS.map((item) => item.receiptNo) },
      },
    },
    orderBy: { createdAt: "asc" },
    select: {
      quantity: true,
      remainingQuantity: true,
      unitCost: true,
      batchNumber: true,
      expiryDate: true,
      receipt: { select: { receiptNo: true, receivedAt: true } },
    },
  });

  console.log(
    JSON.stringify(
      {
        organization: organization.name,
        branch: register.branch.name,
        register: register.name,
        receivedBy: member.user.profile?.fullName ?? member.user.email,
        product: selectedProduct,
        createdReceipts,
        skippedExistingReceipts: existingReceipts,
        lots: lots.map((lot) => ({
          receiptNo: lot.receipt.receiptNo,
          receivedAt: lot.receipt.receivedAt.toISOString(),
          batchNumber: lot.batchNumber,
          expiryDate: lot.expiryDate?.toISOString().slice(0, 10) ?? null,
          quantity: lot.quantity,
          remainingQuantity: lot.remainingQuantity,
          unitCost: lot.unitCost == null ? null : Number(lot.unitCost),
        })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
