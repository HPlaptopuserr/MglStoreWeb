import express from "express";
import jwt from "jsonwebtoken";
import stocktakeRoutes from "../routes/operations/pos/stocktakes.routes";
import { randomUUID } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@mgl/database";
import { createStocktake, mutateStocktake } from "./stocktake.service";

// Opt in only against a disposable local database, never the configured production DB.
const databaseUrl = process.env.DATABASE_URL ?? "";
const enabled =
  process.env.STOCKTAKE_INTEGRATION === "1" &&
  /^postgresql:\/\/[^@]+@127\.0\.0\.1:55437\//.test(databaseUrl);
test(
  "stocktaking transactions, isolation, stale-stock conflict and approval retry",
  { skip: !enabled },
  async (context) => {
    const suffix = randomUUID();
    const actor = await prisma.user.create({
      data: { email: `stocktake-${suffix}@example.invalid` },
    });
    const org = await prisma.organization.create({
      data: { name: "Stocktake test", slug: suffix, taxId: suffix },
    });
    const otherOrg = await prisma.organization.create({
      data: {
        name: "Other",
        slug: `other-${suffix}`,
        taxId: `other-${suffix}`,
      },
    });
    const warehouse = await prisma.warehouse.create({
      data: {
        name: "Internal",
        address: "Test",
        type: "VENDOR_INTERNAL",
        organizations: { create: { organizationId: org.id } },
      },
    });
    const product = await prisma.product.create({
      data: {
        name: "Direct",
        organizationId: org.id,
        price: 100,
        stock: 10,
        unit: "pcs",
      },
    });
    const untouched = await prisma.product.create({
      data: {
        name: "Untouched",
        organizationId: org.id,
        price: 100,
        stock: 5,
        isActive: false,
      },
    });
    const weighted = await prisma.product.create({
      data: {
        name: "Weighted",
        organizationId: org.id,
        price: 100,
        stock: 2200,
        unit: "kg",
        warehouseInventories: {
          create: { warehouseId: warehouse.id, quantity: 2200 },
        },
      },
    });
    const foreign = await prisma.product.create({
      data: {
        name: "Foreign",
        organizationId: otherOrg.id,
        price: 100,
        stock: 99,
      },
    });
    const base = { organizationId: org.id, actorId: actor.id };
    const membership = await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: actor.id,
        role: "STAFF",
        capabilities: ["POS_CASHIER"],
        isPrimary: true,
      },
    });
    const app = express();
    app.use(express.json());
    app.use(stocktakeRoutes);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const api = `http://127.0.0.1:${address.port}/pos/stocktakes`;
    const token = jwt.sign(
      { userId: actor.id, organizationId: org.id },
      process.env.JWT_SECRET || "dev-secret-change-me",
    );
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    try {
      assert.equal((await fetch(`${api}/${org.id}`)).status, 401);
      assert.equal(
        (await fetch(`${api}/${otherOrg.id}`, { headers })).status,
        403,
      );
      assert.equal(
        (
          await fetch(`${api}/${org.id}/unknown`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ action: "approve", version: 0 }),
          })
        ).status,
        403,
      );
      assert.equal((await fetch(`${api}/${org.id}`, { headers })).status, 200);
      const input = {
        ...base,
        id: randomUUID(),
        warehouseId: null,
        title: "Cycle",
        kind: "PARTIAL" as const,
      };
      let session = await createStocktake(input);
      assert.equal((await createStocktake(input)).id, session.id);
      assert.deepEqual(
        new Set(session.lines.map((line) => line.productId)),
        new Set([product.id]),
      );
      await assert.rejects(
        createStocktake({ ...input, id: randomUUID() }),
        /дуусаагүй/,
      );
      await assert.rejects(
        mutateStocktake({
          ...base,
          organizationId: otherOrg.id,
          id: session.id,
          version: 0,
          action: "cancel",
        }),
        /олдсонгүй/,
      );
      const line = session.lines.find((row) => row.productId === product.id)!;
      session = await mutateStocktake({
        ...base,
        id: session.id,
        version: session.version,
        action: "save",
        edits: [{ id: line.id, counted: 8, note: "Missing two" }],
      });
      await assert.rejects(
        mutateStocktake({
          ...base,
          id: session.id,
          version: 0,
          action: "save",
          edits: [{ id: line.id, counted: 7, note: "stale" }],
        }),
        /өөр цонхонд/,
      );
      session = await mutateStocktake({
        ...base,
        id: session.id,
        version: session.version,
        action: "submit",
      });
      await prisma.product.update({
        where: { id: product.id },
        data: { stock: 9 },
      });
      await assert.rejects(
        mutateStocktake({
          ...base,
          id: session.id,
          version: session.version,
          action: "approve",
        }),
        /өөрчлөгдсөн/,
      );
      assert.equal(
        await prisma.inventoryLedger.count({
          where: { referenceId: session.id },
        }),
        0,
      );
      session = await mutateStocktake({
        ...base,
        id: session.id,
        version: session.version,
        action: "reopen",
      });
      session = await mutateStocktake({
        ...base,
        id: session.id,
        version: session.version,
        action: "refresh",
      });
      assert.equal(
        session.lines.find((row) => row.productId === product.id)?.counted,
        null,
      );
      session = await mutateStocktake({
        ...base,
        id: session.id,
        version: session.version,
        action: "save",
        edits: [{ id: line.id, counted: 8, note: "Recounted" }],
      });
      session = await mutateStocktake({
        ...base,
        id: session.id,
        version: session.version,
        action: "submit",
      });
      const approval = {
        ...base,
        id: session.id,
        version: session.version,
        action: "approve" as const,
      };
      const results = await Promise.allSettled([
        mutateStocktake(approval),
        mutateStocktake(approval),
      ]);
      assert.ok(results.some((result) => result.status === "fulfilled"));
      assert.equal((await mutateStocktake(approval)).status, "APPROVED");
      assert.equal(
        (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
          .stock,
        8,
      );
      assert.equal(
        (
          await prisma.product.findUniqueOrThrow({
            where: { id: untouched.id },
          })
        ).stock,
        5,
      );
      assert.equal(
        (await prisma.product.findUniqueOrThrow({ where: { id: foreign.id } }))
          .stock,
        99,
      );
      const ledger = await prisma.inventoryLedger.findMany({
        where: { referenceId: session.id },
      });
      assert.equal(ledger.length, 1);
      assert.equal(ledger[0]?.change, -1);
      await assert.rejects(
        mutateStocktake({
          ...approval,
          action: "reopen",
          version: session.version + 1,
        }),
        /Дууссан/,
      );
      let full = await createStocktake({
        ...base,
        id: randomUUID(),
        warehouseId: warehouse.id,
        title: "Warehouse",
        kind: "FULL",
      });
      assert.equal(full.lines.length, 1);
      await assert.rejects(
        mutateStocktake({
          ...base,
          id: full.id,
          version: full.version,
          action: "submit",
        }),
        /нэг бараа/,
      );
      full = await mutateStocktake({
        ...base,
        id: full.id,
        version: full.version,
        action: "save",
        edits: [
          { id: full.lines[0]!.id, counted: 1250, note: "Weight recount" },
        ],
      });
      full = await mutateStocktake({
        ...base,
        id: full.id,
        version: full.version,
        action: "submit",
      });
      full = await mutateStocktake({
        ...base,
        id: full.id,
        version: full.version,
        action: "approve",
      });
      assert.equal(
        (await prisma.product.findUniqueOrThrow({ where: { id: weighted.id } }))
          .stock,
        1250,
      );
      const stock = await prisma.warehouseInventory.findUniqueOrThrow({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse.id,
            productId: weighted.id,
          },
        },
      });
      assert.equal(stock.quantity, 1250);
      assert.ok(stock.lastAuditedAt);
      await assert.rejects(
        createStocktake({
          ...base,
          organizationId: otherOrg.id,
          id: randomUUID(),
          warehouseId: warehouse.id,
          title: "Forbidden",
          kind: "FULL",
        }),
        /эрхгүй/,
      );
      const started = performance.now();
      for (let batch = 0; batch < 9; batch++)
        await prisma.product.createMany({
          data: Array.from({ length: 1000 }, (_, index) => ({
            name: `Bulk ${batch}-${index}`,
            organizationId: org.id,
            price: 100,
            stock: 2,
          })),
        });
      let bulk = await createStocktake({
        ...base,
        id: randomUUID(),
        warehouseId: null,
        title: "9,000 item full count",
        kind: "FULL",
      });
      assert.equal(bulk.lines.length, 9001);
      const edits = bulk.lines.map((line) => ({
        id: line.id,
        counted: 1,
        note: "Physical verification",
      }));
      for (let offset = 0; offset < edits.length; offset += 500)
        bulk = await mutateStocktake({
          ...base,
          id: bulk.id,
          version: bulk.version,
          action: "save",
          edits: edits.slice(offset, offset + 500),
        });
      bulk = await mutateStocktake({
        ...base,
        id: bulk.id,
        version: bulk.version,
        action: "submit",
      });
      bulk = await mutateStocktake({
        ...base,
        id: bulk.id,
        version: bulk.version,
        action: "approve",
      });
      assert.equal(
        await prisma.inventoryLedger.count({ where: { referenceId: bulk.id } }),
        9001,
      );
      assert.equal(
        await prisma.product.count({
          where: {
            organizationId: org.id,
            warehouseInventories: { none: {} },
            stock: 1,
          },
        }),
        9001,
      );
      context.diagnostic(
        `9,001-line create/save/submit/approve completed in ${Math.round(performance.now() - started)} ms on disposable local PostgreSQL`,
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await prisma.organizationMember.delete({ where: { id: membership.id } });
      await prisma.inventoryLedger.deleteMany({
        where: { createdById: actor.id },
      });
      await prisma.stocktake.deleteMany({ where: { organizationId: org.id } });
      await prisma.product.deleteMany({
        where: { organizationId: { in: [org.id, otherOrg.id] } },
      });
      await prisma.warehouseOrganization.deleteMany({
        where: { warehouseId: warehouse.id },
      });
      await prisma.warehouse.delete({ where: { id: warehouse.id } });
      await prisma.organization.deleteMany({
        where: { id: { in: [org.id, otherOrg.id] } },
      });
      await prisma.user.delete({ where: { id: actor.id } });
      await prisma.$disconnect();
    }
  },
);
