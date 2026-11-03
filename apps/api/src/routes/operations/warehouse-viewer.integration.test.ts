import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import viewerRoutes from "./warehouse-viewer.routes";
import warehousesRoutes from "./warehouses.routes";
import { hasWarehouseAccess } from "../../services/warehouse-access.service";
import type {
  WarehouseInvestorReport,
  WarehouseViewerSession,
} from "@mgl/types";

const url = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled =
  process.env.WAREHOUSE_VIEWER_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(url.hostname) &&
  url.pathname.startsWith("/wms_test_");
test(
  "warehouse viewer: phone grant, scope, mixed roles, reports, snapshot costs, read-only, revocation and disabled accounts",
  { skip: !enabled },
  async () => {
    const marker = randomUUID();
    const app = express();
    app.use(express.json());
    app.use(viewerRoutes);
    app.use(warehousesRoutes);
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const base = `http://127.0.0.1:${address.port}`;
    const users: string[] = [],
      warehouses: string[] = [],
      products: string[] = [];
    let orgId = "";
    const token = (userId: string, role = "USER") =>
      jwt.sign(
        { userId, email: "test@viewer.test", role },
        process.env.JWT_SECRET || "dev-secret-change-me",
      );
    const call = (path: string, auth: string, method = "GET", body?: unknown) =>
      fetch(`${base}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${auth}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    try {
      const admin = await prisma.user.create({
        data: { email: `admin-${marker}@viewer.test`, role: "ADMIN" },
      });
      users.push(admin.id);
      const viewer = await prisma.user.create({
        data: {
          email: `viewer-${marker}@viewer.test`,
          profile: {
            create: { fullName: "Investor", phoneNumber: "99112233" },
          },
        },
      });
      users.push(viewer.id);
      const outsider = await prisma.user.create({
        data: { email: `other-${marker}@viewer.test` },
      });
      users.push(outsider.id);
      for (const name of ["Own", "Other"])
        warehouses.push(
          (
            await prisma.warehouse.create({
              data: {
                name: `${name}-${marker}`,
                address: "test",
                type: "CENTRAL",
              },
            })
          ).id,
        );
      const [own, other] = warehouses;
      assert.equal(
        (await call(`/warehouses/${own}/viewers`, token(viewer.id))).status,
        403,
      );
      assert.equal(
        (
          await call(
            `/warehouses/${own}/viewers`,
            token(admin.id, "ADMIN"),
            "POST",
            { phone: "+976 9911-2233" },
          )
        ).status,
        201,
      );
      assert.equal(
        (
          await call(
            `/warehouses/${own}/viewers`,
            token(admin.id, "ADMIN"),
            "POST",
            { phone: "99112233" },
          )
        ).status,
        201,
      );
      assert.equal(
        await prisma.warehouseViewer.count({
          where: { warehouseId: own, userId: viewer.id },
        }),
        1,
      );
      const session = (await (
        await call("/warehouse-viewer/session", token(viewer.id))
      ).json()) as WarehouseViewerSession;
      assert.equal(session.viewerOnly, true);
      assert.deepEqual(
        session.warehouses.map((warehouse) => warehouse.id),
        [own],
      );
      assert.equal(
        await hasWarehouseAccess({ userId: viewer.id, role: "USER" }, own),
        false,
      );
      assert.equal(
        (
          await call(
            `/warehouse-viewer/warehouses/${other}/report`,
            token(viewer.id),
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await call(
            `/warehouse-viewer/warehouses/${own}/report`,
            token(outsider.id),
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await call(`/warehouses/${own}/products`, token(viewer.id), "POST", {
            name: "Unauthorized",
            price: 1,
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await call(
            `/warehouses/${own}/payment-account`,
            token(viewer.id),
            "PUT",
            { paymentAccountId: "secret" },
          )
        ).status,
        403,
      );
      // A warehouse operator may manage viewers only in their own warehouse.
      await prisma.warehouseSetupToken.create({
        data: {
          userId: outsider.id,
          warehouseId: own,
          token: `operator-${marker}`,
          usedAt: new Date(),
          expiresAt: new Date(),
        },
      });
      assert.equal(
        (await call(`/warehouses/${own}/viewers`, token(outsider.id))).status,
        200,
      );
      assert.equal(
        (await call(`/warehouses/${other}/viewers`, token(outsider.id))).status,
        403,
      );
      assert.equal(
        (
          await call(
            `/warehouses/${other}/viewers`,
            token(outsider.id),
            "POST",
            { phone: "99112233" },
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await call(
            `/warehouses/${other}/viewers/${viewer.id}`,
            token(outsider.id),
            "DELETE",
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await call(`/warehouses/${own}/viewers`, token(viewer.id), "POST", {
            phone: "99112233",
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await call(
            `/warehouses/${own}/viewers/${viewer.id}`,
            token(viewer.id),
            "DELETE",
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await call(
            `/warehouses/${own}/viewers/${viewer.id}`,
            token(outsider.id),
            "DELETE",
          )
        ).status,
        204,
      );
      assert.equal(
        (
          await call(`/warehouses/${own}/viewers`, token(outsider.id), "POST", {
            phone: "99112233",
          })
        ).status,
        201,
      );
      const investmentPath = `/warehouses/${own}/viewers/${viewer.id}/investment`;
      assert.equal(
        (
          await call(investmentPath, token(viewer.id), "PATCH", {
            amount: "1000000.50",
            version: 0,
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await call(
            `/warehouses/${other}/viewers/${viewer.id}/investment`,
            token(outsider.id),
            "PATCH",
            { amount: "1000000.50", version: 0 },
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await call(investmentPath, token(outsider.id), "PATCH", {
            amount: "-1",
            version: 0,
          })
        ).status,
        400,
      );
      const recorded = await call(investmentPath, token(outsider.id), "PATCH", {
        amount: "1000000.50",
        version: 0,
      });
      assert.equal(recorded.status, 200);
      assert.deepEqual(
        await recorded
          .json()
          .then(({ amount, version }: { amount: string; version: number }) => ({
            amount,
            version,
          })),
        { amount: "1000000.50", version: 1 },
      );
      const competing = await Promise.all([
        call(investmentPath, token(outsider.id), "PATCH", {
          amount: "2000000.25",
          version: 1,
          mode: "TOP_UP",
        }),
        call(investmentPath, token(outsider.id), "PATCH", {
          amount: "3000000.75",
          version: 1,
          mode: "TOP_UP",
        }),
      ]);
      assert.deepEqual(
        competing.map((response) => response.status).sort(),
        [200, 409],
      );
      const principal = await prisma.warehouseInvestment.findUniqueOrThrow({
        where: { warehouseId_userId: { warehouseId: own, userId: viewer.id } },
      });
      assert.equal(principal.version, 2);
      assert.ok(["3000000.75", "4000001.25"].includes(principal.amount.toFixed(2)));
      await prisma.warehouseInvestment.create({
        data: {
          warehouseId: own,
          userId: outsider.id,
          updatedById: admin.id,
          amount: "7000000.00",
        },
      });
      const knownMembers = (await (
        await call(`/warehouses/${own}/viewers`, token(outsider.id))
      ).json()) as Array<{
        userId: string;
        investmentAmount: string;
        investmentVersion: number;
      }>;
      assert.equal(
        knownMembers.find((member) => member.userId === viewer.id)
          ?.investmentAmount,
        principal.amount.toFixed(2),
      );
      assert.equal(
        knownMembers.find((member) => member.userId === viewer.id)
          ?.investmentVersion,
        2,
      );
      const weight = await prisma.product.create({
        data: {
          managedByWarehouseId: own,
          name: "Weight",
          price: 20000,
          costPrice: 10000,
          unit: "kg",
          warehouseInventories: {
            create: { warehouseId: own, quantity: 1500 },
          },
        },
      });
      products.push(weight.id);
      const unknown = await prisma.product.create({
        data: {
          managedByWarehouseId: own,
          name: "Unknown",
          price: 1000,
          costPrice: null,
          warehouseInventories: { create: { warehouseId: own, quantity: 2 } },
        },
      });
      products.push(unknown.id);
      const hidden = await prisma.product.create({
        data: {
          managedByWarehouseId: other,
          name: "Other-private-product",
          price: 1,
          costPrice: 1,
        },
      });
      products.push(hidden.id);
      for (let i = 0; i < 20; i++)
        products.push(
          (
            await prisma.product.create({
              data: {
                managedByWarehouseId: own,
                name: `Empty ${i}`,
                price: 100,
                costPrice: 0,
              },
            })
          ).id,
        );
      const paidAt = new Date("2026-10-28T16:00:00.000Z");
      const retail = await prisma.warehouseRetailOrder.create({
        data: {
          customerId: outsider.id,
          warehouseId: own,
          orderNumber: `R-${marker}`,
          checkoutKey: marker,
          phone: "99999999",
          shippingAddress: "private address",
          total: 20000,
          paymentStatus: "PAID",
          status: "CONFIRMED",
          paidAt,
          expiresAt: paidAt,
          items: {
            create: {
              productId: weight.id,
              productName: "Weight snapshot",
              quantity: 1,
              storedQuantity: 1000,
              price: 20000,
              costPrice: 8000,
              subtotal: 20000,
            },
          },
        },
      });
      orgId = (
        await prisma.organization.create({
          data: { name: "Buyer", slug: `viewer-${marker}`, taxId: marker },
        })
      ).id;
      await prisma.warehouseStockRequest.create({
        data: {
          warehouseId: own,
          organizationId: orgId,
          requestedById: outsider.id,
          requestNumber: `SR-${marker}`,
          status: "COMPLETED",
          items: { create: { productId: weight.id, quantity: 1000 } },
          payment: {
            create: {
              invoiceNumber: `W-${marker}`,
              organizationId: orgId,
              totalAmount: 30000,
              paidAmount: 30000,
              status: "PAID",
              paidAt,
              costAmount: 10000,
            },
          },
        },
      });
      await prisma.product.update({
        where: { id: weight.id },
        data: { costPrice: 15000 },
      });
      const reportPath = `/warehouse-viewer/warehouses/${own}/report?from=2026-10-29&to=2026-10-29`;
      const response = await call(reportPath, token(viewer.id));
      assert.equal(response.status, 200);
      const report = (await response.json()) as WarehouseInvestorReport;
      assert.equal(report.investment.scope, "PERSONAL");
      assert.equal(report.investment.amount, principal.amount.toFixed(2));
      const ownWallet = await call(
        `/warehouse-viewer/warehouses/${own}/investment`,
        token(viewer.id),
      );
      assert.equal(ownWallet.status, 200);
      assert.deepEqual(await ownWallet.json(), report.investment);
      assert.equal(
        (
          await call(
            `/warehouse-viewer/warehouses/${other}/investment`,
            token(viewer.id),
          )
        ).status,
        403,
      );
      const operatorReport = (await (
        await call(reportPath, token(outsider.id))
      ).json()) as WarehouseInvestorReport;
      assert.equal(operatorReport.investment.scope, "WAREHOUSE");
      assert.equal(
        operatorReport.investment.amount,
        principal.amount.add("7000000.00").toFixed(2),
      );
      assert.equal(report.inventory.productCount, 22);
      assert.equal(report.inventory.stockCost, 22500);
      assert.equal(report.inventory.stockValue, 32000);
      assert.equal(report.inventory.missingCostCount, 1);
      assert.equal(report.products.items.length, 20);
      assert.equal(report.sales.orderCount, 2);
      assert.equal(report.sales.revenue, 50000);
      assert.equal(report.sales.cost, 18000);
      assert.equal(report.sales.grossProfit, 32000);
      assert.equal(report.history.items.length, 2);
      assert.ok(!JSON.stringify(report).includes("private address"));
      assert.ok(!JSON.stringify(report).includes("99999999"));
      assert.ok(!JSON.stringify(report).includes(hidden.name));
      const second = (await (
        await call(`${reportPath}&productPage=2`, token(viewer.id))
      ).json()) as WarehouseInvestorReport;
      assert.equal(second.products.items.length, 2);
      assert.equal(
        second.products.items.find((product) => product.id === weight.id)
          ?.quantity,
        1.5,
      );
      await prisma.warehouseRetailOrderItem.updateMany({
        where: { orderId: retail.id },
        data: { costPrice: null },
      });
      const incomplete = (await (
        await call(reportPath, token(viewer.id))
      ).json()) as WarehouseInvestorReport;
      assert.equal(incomplete.sales.grossProfit, null);
      assert.equal(incomplete.sales.missingCostCount, 1);
      const previousDay = (await (
        await call(
          `/warehouse-viewer/warehouses/${own}/report?from=2026-10-28&to=2026-10-28`,
          token(viewer.id),
        )
      ).json()) as WarehouseInvestorReport;
      assert.equal(previousDay.sales.orderCount, 0);
      assert.equal(
        (
          await call(
            `/warehouse-viewer/warehouses/${own}/report?from=2026-02-30`,
            token(viewer.id),
          )
        ).status,
        400,
      );
      await prisma.warehouseSetupToken.create({
        data: {
          userId: viewer.id,
          warehouseId: other,
          token: marker,
          usedAt: paidAt,
          expiresAt: paidAt,
        },
      });
      const mixed = (await (
        await call("/warehouse-viewer/session", token(viewer.id))
      ).json()) as WarehouseViewerSession;
      assert.equal(mixed.viewerOnly, false);
      assert.equal(
        mixed.warehouses.find((warehouse) => warehouse.id === own)?.accessMode,
        "VIEWER",
      );
      assert.equal(
        mixed.warehouses.find((warehouse) => warehouse.id === other)
          ?.accessMode,
        "OPERATOR",
      );
      await prisma.user.update({
        where: { id: viewer.id },
        data: { isActive: false },
      });
      assert.equal((await call(reportPath, token(viewer.id))).status, 403);
      await prisma.user.update({
        where: { id: viewer.id },
        data: { isActive: true },
      });
      assert.equal(
        (
          await call(
            `/warehouses/${own}/viewers/${viewer.id}`,
            token(admin.id, "ADMIN"),
            "DELETE",
          )
        ).status,
        204,
      );
      assert.equal((await call(reportPath, token(viewer.id))).status, 403);
      assert.equal(
        (
          await prisma.warehouseInvestment.findUniqueOrThrow({
            where: { id: principal.id },
          })
        ).amount.toFixed(2),
        principal.amount.toFixed(2),
      );
      assert.equal(
        (
          await call(`/warehouses/${own}/viewers`, token(outsider.id), "POST", {
            phone: "99112233",
          })
        ).status,
        201,
      );
      const restored = (await (
        await call(reportPath, token(viewer.id))
      ).json()) as WarehouseInvestorReport;
      assert.equal(restored.investment.amount, principal.amount.toFixed(2));
      assert.equal(
        await prisma.auditLog.count({
          where: {
            userId: outsider.id,
            action: "WAREHOUSE_INVESTMENT_UPDATED",
          },
        }),
        2,
      );
      assert.equal(
        await prisma.auditLog.count({
          where: { userId: admin.id, action: "WAREHOUSE_VIEWER_REVOKED" },
        }),
        1,
      );
    } finally {
      await prisma.warehouseRetailOrder.deleteMany({
        where: { warehouseId: { in: warehouses } },
      });
      await prisma.warehouseStockRequest.deleteMany({
        where: { warehouseId: { in: warehouses } },
      });
      await prisma.warehouseViewer.deleteMany({
        where: { warehouseId: { in: warehouses } },
      });
      await prisma.warehouseSetupToken.deleteMany({
        where: { warehouseId: { in: warehouses } },
      });
      await prisma.product.deleteMany({ where: { id: { in: products } } });
      await prisma.warehouseInvestment.deleteMany({
        where: { warehouseId: { in: warehouses } },
      });
      await prisma.warehouse.deleteMany({ where: { id: { in: warehouses } } });
      if (orgId) await prisma.organization.delete({ where: { id: orgId } });
      await prisma.auditLog.deleteMany({ where: { userId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
      await prisma.$disconnect();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  },
);
