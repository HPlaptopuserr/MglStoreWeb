import "../config/env";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { unlinkSync } from "node:fs";
import { prisma } from "@mgl/database";
import { correctReceipt } from "./receipt-correction.service";
import { parseReceiptCorrection } from "./receipt-correction.policy";
const enabled =
  process.env.RECEIPT_CORRECTION_TEST === "1" &&
  /^postgresql:\/\/[^@]+@(localhost|127\.0\.0\.1):5432\//.test(
    process.env.DATABASE_URL || "",
  );
const { consolidate } =
  require("../../../../scripts/consolidate-pos-receipts.cjs") as {
    consolidate: (
      db: typeof prisma,
      manifest: Record<string, unknown>,
      apply?: boolean,
      backupPath?: string,
    ) => Promise<{ preserved?: boolean; alreadyApplied?: boolean }>;
  };
test(
  "local receipt consolidation and owner corrections preserve lots, sale allocations and stock",
  { skip: !enabled },
  async () => {
    const id = randomUUID();
    const user = await prisma.user.create({
      data: { email: `receipt-${id}@example.invalid` },
    });
    const org = await prisma.organization.create({
      data: { name: "Receipt test", slug: id, taxId: id },
    });
    const owner = {
      id: user.id,
      role: "USER",
      organizationId: org.id,
      orgRole: "OWNER",
    };
    const backup = `/tmp/receipt-merge-test-${id}.json`;
    try {
      const branch = await prisma.branch.create({
        data: { organizationId: org.id, name: "test", address: "test" },
      });
      const register = await prisma.posRegister.create({
        data: { organizationId: org.id, branchId: branch.id, name: "test" },
      });
      const warehouse = await prisma.warehouse.create({
        data: {
          name: "test",
          address: "test",
          type: "VENDOR_INTERNAL",
          organizations: { create: { organizationId: org.id } },
        },
      });
      const product = await prisma.product.create({
        data: {
          organizationId: org.id,
          name: "Product",
          unit: "pcs",
          price: 200,
          stock: 17,
        },
      });
      await prisma.warehouseInventory.create({
        data: {
          warehouseId: warehouse.id,
          productId: product.id,
          quantity: 17,
        },
      });
      const receipts = [];
      for (let n = 0; n < 2; n++)
        receipts.push(
          await prisma.posGoodsReceipt.create({
            data: {
              receiptNo: `TEST-${id}-${n}`,
              organizationId: org.id,
              branchId: branch.id,
              registerId: register.id,
              receivedById: user.id,
              supplierName: "supplier",
              items: {
                create: {
                  productId: product.id,
                  quantity: 10,
                  remainingQuantity: n === 0 ? 7 : 10,
                  unitCost: 100,
                },
              },
            },
            include: { items: true },
          }),
        );
      const first = receipts[0]!;
      const second = receipts[1]!;
      const allocation = await prisma.posGoodsReceiptAllocation.create({
        data: {
          receiptItemId: first.items[0]!.id,
          referenceId: id,
          referenceType: "POS_SALE",
          quantity: 3,
          unitCost: 100,
          totalCost: 300,
        },
      });
      const manifest = {
        organizationId: org.id,
        registerId: register.id,
        supplierName: "supplier",
        receiptIds: receipts.map((r) => r.id),
        targetId: first.id,
        actorId: user.id,
        reason: "Single supplier delivery",
      };
      await consolidate(prisma, manifest);
      assert.equal(
        (
          await prisma.posGoodsReceipt.findUniqueOrThrow({
            where: { id: second.id },
          })
        ).mergedIntoId,
        null,
      );
      assert.equal(
        (await consolidate(prisma, manifest, true, backup)).preserved,
        true,
      );
      assert.equal(
        (await consolidate(prisma, manifest, true, backup)).alreadyApplied,
        true,
      );
      assert.equal(
        (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
          .stock,
        17,
      );
      assert.equal(
        (
          await prisma.posGoodsReceiptItem.findUniqueOrThrow({
            where: { id: second.items[0]!.id },
          })
        ).receiptId,
        first.id,
      );
      assert.deepEqual(
        await prisma.posGoodsReceiptAllocation.findUniqueOrThrow({
          where: { id: allocation.id },
        }),
        allocation,
      );
      const payload = parseReceiptCorrection({
        version: 2,
        reason: "Correct purchase invoice",
        supplierName: "supplier",
        items: [
          {
            id: first.items[0]!.id,
            quantity: 9,
            unitCost: 110,
            salePrice: 250,
            previousSalePrice: 200,
          },
          { id: second.items[0]!.id, quantity: 10, unitCost: 100 },
        ],
      });
      await assert.rejects(
        correctReceipt(first.id, { ...owner, orgRole: "CASHIER" }, payload),
        /эзэмшигч/,
      );
      await correctReceipt(first.id, owner, payload);
      const updated = await prisma.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      assert.equal(updated.stock, 16);
      assert.equal(Number(updated.price), 250);
      assert.equal(
        (
          await prisma.posGoodsReceiptItem.findUniqueOrThrow({
            where: { id: first.items[0]!.id },
          })
        ).remainingQuantity,
        6,
      );
      assert.deepEqual(
        await prisma.posGoodsReceiptAllocation.findUniqueOrThrow({
          where: { id: allocation.id },
        }),
        allocation,
      );
      assert.equal(
        await prisma.posGoodsReceiptRevision.count({
          where: { receiptId: first.id },
        }),
        2,
      );
      await assert.rejects(
        correctReceipt(first.id, owner, payload),
        /өөрчлөгдсөн/,
      );
      await assert.rejects(
        correctReceipt(first.id, owner, {
          ...payload,
          version: 3,
          items: payload.items.map((i) => ({
            ...i,
            quantity: 1,
            salePrice: undefined,
          })),
        }),
        /зарцуулсан/,
      );
      assert.equal(
        (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
          .stock,
        16,
      );
      await correctReceipt(first.id, owner, {
        ...payload,
        version: 3,
        items: payload.items.map((item) => ({
          ...item,
          salePrice: undefined,
          quantity: item.id === second.items[0]!.id ? 0 : 9,
        })),
      });
      assert.equal(
        (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
          .stock,
        6,
      );
      assert.equal(
        (
          await prisma.posGoodsReceiptItem.findUniqueOrThrow({
            where: { id: second.items[0]!.id },
          })
        ).remainingQuantity,
        0,
      );
      assert.equal(
        await prisma.posGoodsReceiptRevision.count({
          where: { receiptId: first.id },
        }),
        3,
      );
    } finally {
      await prisma.posGoodsReceiptRevision.deleteMany({
        where: { receipt: { organizationId: org.id } },
      });
      await prisma.posGoodsReceipt.updateMany({
        where: { organizationId: org.id },
        data: { mergedIntoId: null },
      });
      await prisma.posGoodsReceipt.deleteMany({
        where: { organizationId: org.id },
      });
      await prisma.inventoryLedger.deleteMany({
        where: { product: { organizationId: org.id } },
      });
      await prisma.warehouseInventory.deleteMany({
        where: { product: { organizationId: org.id } },
      });
      await prisma.product.deleteMany({ where: { organizationId: org.id } });
      await prisma.posRegister.deleteMany({
        where: { organizationId: org.id },
      });
      await prisma.branch.deleteMany({ where: { organizationId: org.id } });
      const warehouses = await prisma.warehouseOrganization.findMany({
        where: { organizationId: org.id },
      });
      await prisma.warehouseOrganization.deleteMany({
        where: { organizationId: org.id },
      });
      await prisma.warehouse.deleteMany({
        where: { id: { in: warehouses.map((w) => w.warehouseId) } },
      });
      await prisma.organization.delete({ where: { id: org.id } });
      await prisma.user.delete({ where: { id: user.id } });
      try {
        unlinkSync(backup);
      } catch {
        /* Not created when a check fails before merging. */
      }
      await prisma.$disconnect();
    }
  },
);
