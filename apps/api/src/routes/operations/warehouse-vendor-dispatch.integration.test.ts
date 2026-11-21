import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { prisma } from "@mgl/database";
import {
  createManualDispatch,
  searchDispatchVendors,
  listVendorManualDispatches,
  acceptVendorManualDispatch,
  updateVendorDispatchSalePrices,
} from "../../services/warehouse-manual-dispatch.service";

const database = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled =
  process.env.WAREHOUSE_VIEWER_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(database.hostname) &&
  database.pathname.startsWith("/wms_test_");
test(
  "registered vendor dispatch requires owner acceptance and credits stock exactly once",
  { skip: !enabled },
  async () => {
    const marker = randomUUID();
    const users: string[] = [],
      orgs: string[] = [],
      warehouses: string[] = [];
    try {
      for (const name of ["operator", "owner", "staff", "outsider"]) {
        users.push(
          (
            await prisma.user.create({
              data: { email: `${name}-${marker}@dispatch.test` },
            })
          ).id,
        );
      }
      const [operator, owner, staff, outsider] = users;
      const actor = (userId: string) => ({
        userId,
        role: "USER",
        email: "test@dispatch.test",
      });
      for (const name of ["vendor", "no-owner", "other"]) {
        orgs.push(
          (
            await prisma.organization.create({
              data: {
                name: `${name}-${marker}`,
                slug: `${name}-${marker}`,
                taxId: `${name}-${marker}`,
                status: "PENDING",
              },
            })
          ).id,
        );
      }
      const [organizationId] = orgs;
      await prisma.organizationMember.createMany({
        data: [
          { userId: owner, organizationId, role: "OWNER" },
          { userId: staff, organizationId, role: "STAFF" },
          { userId: outsider, organizationId: orgs[2], role: "OWNER" },
        ],
      });
      const warehouse = await prisma.warehouse.create({
        data: { name: marker, address: "Test", type: "CENTRAL" },
      });
      warehouses.push(warehouse.id);
      await prisma.warehouseSetupToken.create({
        data: {
          warehouseId: warehouse.id,
          userId: operator,
          token: marker,
          usedAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      const product = await prisma.product.create({
        data: {
          name: "Snapshot product",
          managedByWarehouseId: warehouse.id,
          price: 125,
          sku: marker,
          barcode: marker,
          unit: "ш",
          stock: 20,
          warehouseInventories: {
            create: { warehouseId: warehouse.id, quantity: 20 },
          },
        },
      });
      const search = await searchDispatchVendors(
        actor(operator),
        warehouse.id,
        { search: marker },
      );
      assert.equal(
        search.vendors.length,
        3,
        "new orgs without owner or POS must be searchable",
      );
      const draft = {
        requestId: randomUUID(),
        recipientOrganizationId: organizationId,
        storeName: "forged",
        recipientName: "forged",
        items: [{ productId: product.id, quantity: 4 }],
      };
      const dispatch = await createManualDispatch(
        actor(operator),
        warehouse.id,
        draft,
      );
      assert.equal(dispatch.storeName, `vendor-${marker}`);
      assert.equal(dispatch.receiptStatus, "PENDING");
      assert.equal(dispatch.items[0]?.barcode, marker);
      assert.equal(
        dispatch.recipientName,
        "forged",
        "explicit delivery contact is preserved",
      );
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          name: "Renamed recipient",
          phone: "99112233",
          address: "Updated vendor address",
        },
      });
      assert.equal(
        await prisma.product.count({ where: { organizationId } }),
        0,
      );
      assert.equal(
        (await createManualDispatch(actor(operator), warehouse.id, draft)).id,
        dispatch.id,
      );
      await assert.rejects(
        listVendorManualDispatches(actor(staff), { organizationId }),
        { status: 403 },
      );
      await assert.rejects(
        acceptVendorManualDispatch(actor(staff), dispatch.id, organizationId),
        { status: 403 },
      );
      await assert.rejects(
        acceptVendorManualDispatch(actor(outsider), dispatch.id, orgs[2]),
        { status: 404 },
      );
      assert.equal(
        (await listVendorManualDispatches(actor(owner), { organizationId }))
          .total,
        1,
      );
      await prisma.product.update({
        where: { id: product.id },
        data: {
          name: "Later renamed",
          price: 999,
          barcode: `changed-${marker}`,
        },
      });
      const prices = (record: typeof dispatch, salePrice = "250") =>
        record.items.map((item) => ({ itemId: item.id, salePrice }));
      await assert.rejects(
        acceptVendorManualDispatch(actor(owner), dispatch.id, organizationId),
        { status: 400 },
      );
      await assert.rejects(
        acceptVendorManualDispatch(
          actor(owner),
          dispatch.id,
          organizationId,
          prices(dispatch, "0"),
        ),
        { status: 400 },
      );
      const accepted = await Promise.all(
        [1, 2, 3].map(() =>
          acceptVendorManualDispatch(
            actor(owner),
            dispatch.id,
            organizationId,
            prices(dispatch),
          ),
        ),
      );
      assert.ok(
        accepted.every((record) => record.receiptStatus === "ACCEPTED"),
      );
      assert.ok(
        accepted.every((record) => record.items[0]?.barcode === marker),
      );
      const adopted = await prisma.product.findFirstOrThrow({
        where: { organizationId },
      });
      assert.equal(adopted.name, "Snapshot product");
      assert.equal(adopted.price.toString(), "250");
      assert.equal(adopted.costPrice?.toString(), "125");
      assert.equal(accepted[0].items[0]?.salePrice, "250.00");
      await assert.rejects(
        updateVendorDispatchSalePrices(
          actor(staff),
          dispatch.id,
          organizationId,
          prices(dispatch),
        ),
        { status: 403 },
      );
      await assert.rejects(
        updateVendorDispatchSalePrices(
          actor(outsider),
          dispatch.id,
          orgs[2],
          prices(dispatch),
        ),
        { status: 404 },
      );
      const repriced = await updateVendorDispatchSalePrices(
        actor(owner),
        dispatch.id,
        organizationId,
        prices(dispatch, "300"),
      );
      assert.equal(repriced.items[0]?.salePrice, "300.00");
      assert.equal(repriced.totalAmount, dispatch.totalAmount);
      assert.equal(
        (await prisma.product.findUniqueOrThrow({ where: { id: adopted.id } }))
          .stock,
        4,
      );
      await acceptVendorManualDispatch(
        actor(owner),
        dispatch.id,
        organizationId,
        prices(dispatch, "999"),
      );
      assert.equal(
        (
          await prisma.product.findUniqueOrThrow({ where: { id: adopted.id } })
        ).price.toString(),
        "300",
      );
      assert.equal(adopted.stock, 4);
      assert.equal(
        (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
          .stock,
        16,
      );
      assert.equal(
        await prisma.inventoryLedger.count({
          where: {
            referenceId: dispatch.id,
            referenceType: "WAREHOUSE_DISPATCH_RECEIPT",
          },
        }),
        1,
      );
      const second = await createManualDispatch(actor(operator), warehouse.id, {
        ...draft,
        requestId: randomUUID(),
      });
      await acceptVendorManualDispatch(
        actor(owner),
        second.id,
        organizationId,
        prices(second, "350"),
      );
      assert.equal(
        (
          await prisma.product.findUniqueOrThrow({ where: { id: adopted.id } })
        ).price.toString(),
        "350",
      );
      assert.equal(
        await prisma.product.count({ where: { organizationId } }),
        1,
      );
      assert.equal(
        (await prisma.product.findUniqueOrThrow({ where: { id: adopted.id } }))
          .stock,
        8,
      );
      // Any line conflict must roll back the entire receipt and leave it pending.
      const additionalSource = await prisma.product.create({
        data: {
          name: "Rollback product",
          managedByWarehouseId: warehouse.id,
          price: 50,
          sku: `rollback-${marker}`,
          unit: "ш",
          stock: 10,
          warehouseInventories: {
            create: { warehouseId: warehouse.id, quantity: 10 },
          },
        },
      });
      const additionalVendorProduct = await prisma.product.create({
        data: {
          organizationId,
          name: "Existing rollback product",
          sku: `WD-${additionalSource.id}`,
          price: 50,
          unit: "ш",
          stock: 0,
        },
      });
      const third = await createManualDispatch(actor(operator), warehouse.id, {
        ...draft,
        requestId: randomUUID(),
        items: [
          ...draft.items,
          { productId: additionalSource.id, quantity: 2 },
        ],
      });
      const receiptLines = await prisma.warehouseManualDispatchItem.findMany({
        where: { dispatchId: third.id },
        orderBy: { id: "asc" },
      });
      // Fail on the last line, after the first line has attempted a stock credit.
      const conflictingVendorProductId =
        receiptLines[1].productId === product.id
          ? adopted.id
          : additionalVendorProduct.id;
      await prisma.product.update({
        where: { id: conflictingVendorProductId },
        data: { unit: "kg" },
      });
      await assert.rejects(
        acceptVendorManualDispatch(
          actor(owner),
          third.id,
          organizationId,
          prices(third),
        ),
        { status: 409 },
      );
      assert.equal(
        (
          await prisma.warehouseManualDispatch.findUniqueOrThrow({
            where: { id: third.id },
          })
        ).acceptedAt,
        null,
      );
      assert.equal(
        (await prisma.product.findUniqueOrThrow({ where: { id: adopted.id } }))
          .stock,
        8,
      );
      assert.equal(
        (
          await prisma.product.findUniqueOrThrow({
            where: { id: additionalVendorProduct.id },
          })
        ).stock,
        0,
      );
      assert.equal(
        await prisma.warehouseManualDispatchItem.count({
          where: { dispatchId: third.id, receivedProductId: { not: null } },
        }),
        0,
      );
      assert.equal(
        await prisma.inventoryLedger.count({
          where: {
            referenceId: third.id,
            referenceType: "WAREHOUSE_DISPATCH_RECEIPT",
          },
        }),
        0,
      );
    } finally {
      const internal = await prisma.warehouseOrganization.findMany({
        where: { organizationId: { in: orgs } },
        select: { warehouseId: true },
      });
      warehouses.push(...internal.map((row) => row.warehouseId));
      await prisma.inventoryLedger.deleteMany({
        where: { createdById: { in: users } },
      });
      await prisma.warehouseManualDispatch.deleteMany({
        where: { warehouseId: { in: warehouses } },
      });
      await prisma.warehouseInventory.deleteMany({
        where: { warehouseId: { in: warehouses } },
      });
      await prisma.product.deleteMany({
        where: {
          OR: [
            { organizationId: { in: orgs } },
            { managedByWarehouseId: { in: warehouses } },
          ],
        },
      });
      await prisma.warehouseSetupToken.deleteMany({
        where: { userId: { in: users } },
      });
      await prisma.warehouseOrganization.deleteMany({
        where: { organizationId: { in: orgs } },
      });
      await prisma.warehouse.deleteMany({ where: { id: { in: warehouses } } });
      await prisma.organizationMember.deleteMany({
        where: { organizationId: { in: orgs } },
      });
      await prisma.organization.deleteMany({ where: { id: { in: orgs } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
      await prisma.$disconnect();
    }
  },
);
