import path from "node:path";
import dotenv from "dotenv";
import { InventoryReason, prisma } from "@mgl/database";
import {
  adjustStock,
  resolveOrgWarehouse,
} from "../services/inventory.service";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config();

const RECEIPT_NO = "PGR-NAMA-20-ITEMS-001";

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

  const [register, member, existing] = await Promise.all([
    prisma.posRegister.findFirst({
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
    }),
    prisma.organizationMember.findFirst({
      where: {
        organizationId: organization.id,
        deletedAt: null,
        user: { isActive: true, deletedAt: null },
      },
      orderBy: { createdAt: "asc" },
      select: {
        userId: true,
        user: {
          select: { email: true, profile: { select: { fullName: true } } },
        },
      },
    }),
    prisma.posGoodsReceipt.findUnique({
      where: { receiptNo: RECEIPT_NO },
      select: { id: true },
    }),
  ]);
  if (!register) throw new Error('"nama" байгууллагад идэвхтэй POS касс алга.');
  if (!member) throw new Error('"nama" байгууллагад идэвхтэй ажилтан алга.');

  if (!existing) {
    const products = await Promise.all(
      Array.from({ length: 20 }, (_, index) => {
        const number = String(index + 1).padStart(2, "0");
        const sku = `NAMA-MOCK-${number}`;
        return prisma.product.upsert({
          where: {
            organizationId_sku: { organizationId: organization.id, sku },
          },
          update: {
            name: `Тест хүлээн авалтын бараа ${number}`,
            isActive: true,
            deletedAt: null,
          },
          create: {
            organizationId: organization.id,
            name: `Тест хүлээн авалтын бараа ${number}`,
            sku,
            barcode: `2900000000${number}`,
            unit: "ширхэг",
            price: 5_000 + index * 500,
            costPrice: 3_000 + index * 125,
            stock: 0,
          },
          select: { id: true, name: true, sku: true },
        });
      }),
    );

    const receivedAt = new Date();
    const expiryBase = new Date(
      Date.UTC(receivedAt.getUTCFullYear() + 1, receivedAt.getUTCMonth(), 1),
    );
    await prisma.$transaction(
      async (tx) => {
        await tx.posGoodsReceipt.create({
          data: {
            receiptNo: RECEIPT_NO,
            organizationId: organization.id,
            branchId: register.branchId,
            registerId: register.id,
            receivedById: member.userId,
            supplierName: "Тест нийлүүлэгч ХХК",
            supplierRegisterNo: "1234567",
            documentNo: "TEST-PADAAN-20-001",
            note: "20 өөр төрлийн бараатай урт орлогын баримтын UI/print тест",
            receivedAt,
            items: {
              create: products.map((product, index) => ({
                productId: product.id,
                quantity: index + 1,
                remainingQuantity: index + 1,
                unitCost: 3_000 + index * 125,
                batchNumber: `BATCH-2026-${String(index + 1).padStart(2, "0")}`,
                expiryDate: new Date(
                  Date.UTC(
                    expiryBase.getUTCFullYear(),
                    expiryBase.getUTCMonth() + index,
                    1,
                  ),
                ),
              })),
            },
          },
        });
        for (const [index, product] of products.entries()) {
          const warehouseId = await resolveOrgWarehouse(
            tx,
            organization.id,
            product.id,
          );
          await adjustStock(tx, {
            productId: product.id,
            warehouseId: warehouseId ?? undefined,
            change: index + 1,
            reason: InventoryReason.RESTOCK,
            note: `20 бараатай mock хүлээн авалт ${RECEIPT_NO}`,
            createdById: member.userId,
            referenceId: RECEIPT_NO,
            referenceType: "POS_GOODS_RECEIPT",
          });
        }
      },
      { timeout: 60_000 },
    );
  }

  const receipt = await prisma.posGoodsReceipt.findUniqueOrThrow({
    where: { receiptNo: RECEIPT_NO },
    select: {
      id: true,
      receiptNo: true,
      documentNo: true,
      supplierName: true,
      items: { select: { quantity: true, unitCost: true } },
    },
  });
  console.log(
    JSON.stringify(
      {
        created: !existing,
        organization: organization.name,
        branch: register.branch.name,
        register: register.name,
        receivedBy: member.user.profile?.fullName ?? member.user.email,
        receiptNo: receipt.receiptNo,
        documentNo: receipt.documentNo,
        supplier: receipt.supplierName,
        productTypes: receipt.items.length,
        totalQuantity: receipt.items.reduce(
          (sum, item) => sum + item.quantity,
          0,
        ),
        totalCost: receipt.items.reduce(
          (sum, item) => sum + item.quantity * Number(item.unitCost ?? 0),
          0,
        ),
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
  .finally(async () => prisma.$disconnect());
