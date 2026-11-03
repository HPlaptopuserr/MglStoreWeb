import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "@mgl/database";
import { createStocktake, mutateStocktake } from "./stocktake.service";

const databaseUrl = process.env.DATABASE_URL ?? "";
const enabled =
  process.env.STOCKTAKE_INTEGRATION === "1" &&
  (/^postgresql:\/\/[^@]+@127\.0\.0\.1:55437\//.test(databaseUrl) ||
    (process.env.STOCKTAKE_TEST_DATABASE_URL === databaseUrl &&
      /^postgresql:\/\/[^@]+@127\.0\.0\.1:5432\/wms_test_/.test(databaseUrl)));

test(
  "vendor direct stock changes only after approval, including zero and retry",
  { skip: !enabled },
  async () => {
    const suffix = randomUUID();
    const actor = await prisma.user.create({
      data: { email: `${suffix}@example.invalid` },
    });
    const org = await prisma.organization.create({
      data: { name: "Vendor verification", slug: suffix, taxId: suffix },
    });
    const base = { organizationId: org.id, actorId: actor.id };
    try {
      const product = await prisma.product.create({
        data: {
          name: "Counted",
          organizationId: org.id,
          price: 100,
          stock: 10,
        },
      });
      const untouched = await prisma.product.create({
        data: {
          name: "Uncounted",
          organizationId: org.id,
          price: 100,
          stock: 5,
        },
      });
      for (const quantity of [8, 12, 0]) {
        const before = (
          await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
        ).stock;
        let session = await createStocktake({
          ...base,
          id: randomUUID(),
          title: "Vendor count",
          warehouseId: null,
          kind: "PARTIAL",
        });
        const line = session.lines.find((row) => row.productId === product.id);
        assert.ok(line);
        session = await mutateStocktake({
          ...base,
          id: session.id,
          version: session.version,
          action: "save",
          edits: [{ id: line.id, counted: quantity, note: "Physical count" }],
        });
        assert.equal(
          (
            await prisma.product.findUniqueOrThrow({
              where: { id: product.id },
            })
          ).stock,
          before,
        );
        session = await mutateStocktake({
          ...base,
          id: session.id,
          version: session.version,
          action: "submit",
        });
        assert.equal(
          (
            await prisma.product.findUniqueOrThrow({
              where: { id: product.id },
            })
          ).stock,
          before,
        );
        const approval = {
          ...base,
          id: session.id,
          version: session.version,
          action: "approve" as const,
        };
        assert.equal((await mutateStocktake(approval)).status, "APPROVED");
        await mutateStocktake(approval);
        assert.equal(
          (
            await prisma.product.findUniqueOrThrow({
              where: { id: product.id },
            })
          ).stock,
          quantity,
        );
        assert.equal(
          (
            await prisma.product.findUniqueOrThrow({
              where: { id: untouched.id },
            })
          ).stock,
          5,
        );
        const ledger = await prisma.inventoryLedger.findMany({
          where: { referenceId: session.id },
        });
        assert.equal(ledger.length, 1);
        assert.equal(ledger[0]?.change, quantity - before);
      }
    } finally {
      await prisma.inventoryLedger.deleteMany({
        where: { product: { organizationId: org.id } },
      });
      await prisma.stocktake.deleteMany({ where: { organizationId: org.id } });
      await prisma.product.deleteMany({ where: { organizationId: org.id } });
      await prisma.organization.delete({ where: { id: org.id } });
      await prisma.user.delete({ where: { id: actor.id } });
      await prisma.$disconnect();
    }
  },
);
