import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { prisma, Prisma } from "@mgl/database";
import {
  analyzePosRecipeConsumption,
  summarizeSupplyMonth,
  type ProductRecipe,
  type SupplyMonth,
} from "@mgl/types";
import {
  capturePosRecipeSnapshots,
  bindPendingRecipeSnapshots,
} from "./pos-recipe-snapshot.service";
import { readSupplyPosSources } from "./supply-pos-consumption.service";

const url = new URL(process.env.DATABASE_URL || "http://disabled");
const enabled =
  process.env.RECIPE_SNAPSHOT_INTEGRATION === "1" &&
  ["localhost", "127.0.0.1"].includes(url.hostname);
after(async () => {
  if (enabled) await prisma.$disconnect();
});

test(
  "completed POS portions consume every ingredient once, preserve recipe history and restore on void",
  { skip: !enabled },
  async () => {
    const rollback = new Error("INTENTIONAL_INTEGRATION_ROLLBACK");
    try {
      await prisma.$transaction(
        async (tx) => {
          const nonce = randomUUID();
          const organization = await tx.organization.create({
            data: {
              name: `Recipe snapshot ${nonce}`,
              slug: `recipe-snapshot-${nonce}`,
              taxId: `test-${nonce}`,
            },
          });
          const user = await tx.user.create({
            data: { email: `recipe-${nonce}@example.test` },
          });
          const branch = await tx.branch.create({
            data: {
              organizationId: organization.id,
              name: "Test branch",
              address: "Test",
            },
          });
          const shift = await tx.posShift.create({
            data: {
              organizationId: organization.id,
              branchId: branch.id,
              cashierId: user.id,
              openingCash: 0,
            },
          });
          const product = await tx.product.create({
            data: {
              organizationId: organization.id,
              name: "Тест хоол",
              isRestaurantMenuItem: true,
              price: 20000,
            },
          });
          const recipe: ProductRecipe = {
            kind: "FOOD",
            yieldQuantity: 1,
            servingLabel: "1 порц",
            laborCost: 0,
            overheadCost: 0,
            instructions: "",
            ingredients: [
              {
                name: "Мах",
                quantity: 200,
                unit: "g",
                packageQuantity: 1,
                packageUnit: "kg",
                packagePrice: null,
              },
              {
                name: "Будаа",
                quantity: 150,
                unit: "g",
                packageQuantity: 1,
                packageUnit: "kg",
                packagePrice: null,
              },
              {
                name: "Тос",
                quantity: 20,
                unit: "ml",
                packageQuantity: 1,
                packageUnit: "l",
                packagePrice: null,
              },
            ],
          };
          const recipeJson = (
            value: ProductRecipe,
          ): Prisma.InputJsonObject => ({
            ...value,
            ingredients: value.ingredients.map((row) => ({ ...row })),
          });
          await tx.productRecipe.create({
            data: { productId: product.id, data: recipeJson(recipe) },
          });
          const createSale = (
            qty: number,
            date = new Date("2026-11-08T01:00:00Z"),
          ) =>
            tx.posSale.create({
              data: {
                receiptNo: `TEST-${randomUUID()}`,
                organizationId: organization.id,
                branchId: branch.id,
                shiftId: shift.id,
                cashierId: user.id,
                paymentMethod: "CASH",
                subtotal: qty * 20000,
                taxTotal: 0,
                discountTotal: 0,
                grandTotal: qty * 20000,
                createdAt: date,
                lines: {
                  create: {
                    productId: product.id,
                    productName: product.name,
                    qty,
                    unitPrice: 20000,
                    taxAmount: 0,
                    discount: 0,
                    lineTotal: qty * 20000,
                  },
                },
              },
            });
          const data: SupplyMonth = {
            materials: [
              {
                id: "meat",
                name: "Хонины мах",
                unit: "kg",
                openingQuantity: 0,
                receipts: [
                  {
                    id: "r1",
                    date: "2026-11-01",
                    quantity: 150,
                    unitPrice: 18000,
                    supplier: "",
                  },
                ],
                usages: [],
              },
              {
                id: "rice",
                name: "Будаа",
                unit: "kg",
                openingQuantity: 50,
                receipts: [],
                usages: [],
              },
              {
                id: "oil",
                name: "Тос",
                unit: "l",
                openingQuantity: 20,
                receipts: [],
                usages: [],
              },
            ],
            posBindings: [
              {
                productId: product.id,
                ingredientIndex: 0,
                ingredientName: "Мах",
                materialId: "meat",
                unit: "kg",
              },
              {
                productId: product.id,
                ingredientIndex: 1,
                ingredientName: "Будаа",
                materialId: "rice",
                unit: "kg",
              },
              {
                productId: product.id,
                ingredientIndex: 2,
                ingredientName: "Тос",
                materialId: "oil",
                unit: "l",
              },
            ],
          };
          const supplyJson = () => ({
            materials: data.materials.map((material) => ({
              ...material,
              receipts: material.receipts.map((row) => ({ ...row })),
              usages: [],
            })),
            posBindings: data.posBindings!.map((binding) => ({ ...binding })),
          });
          await tx.restaurantSupplyMonth.create({
            data: {
              organizationId: organization.id,
              month: "2026-11",
              data: supplyJson(),
            },
          });
          const first = await createSale(50);
          await capturePosRecipeSnapshots(tx, first.id);
          await capturePosRecipeSnapshots(tx, first.id);
          assert.equal(
            await tx.posSaleRecipeSnapshot.count({
              where: { saleLine: { saleId: first.id } },
            }),
            1,
          );
          const changed = structuredClone(recipe);
          changed.ingredients[0].quantity = 300;
          await tx.productRecipe.update({
            where: { productId: product.id },
            data: { data: recipeJson(changed), version: { increment: 1 } },
          });
          await capturePosRecipeSnapshots(tx, first.id); // Must not rewrite the original 200 g recipe.
          const second = await createSale(10);
          await capturePosRecipeSnapshots(tx, second.id);
          const previousMonth = await createSale(
            1,
            new Date("2026-10-31T15:59:59.999Z"),
          );
          await capturePosRecipeSnapshots(tx, previousMonth.id);
          await createSale(1); // Legacy sale without a historical recipe must be reported, not guessed.
          const report = async () => {
            const source = await readSupplyPosSources(
              tx,
              organization.id,
              "2026-11",
            );
            const analysis = analyzePosRecipeConsumption(
              data.materials,
              data.posBindings || [],
              source.posSources,
            );
            assert.deepEqual(analysis.issues, []);
            return {
              source,
              rows: summarizeSupplyMonth(data, analysis.consumptions),
            };
          };
          const before = await report();
          assert.equal(before.source.uncapturedSaleLines, 1);
          assert.deepEqual(
            before.rows.map((row) => row.usedQuantity),
            [13, 9, 1.2],
          );
          assert.equal(before.rows[0].remainingQuantity, 137);
          assert.equal(before.rows[0].dishes[0].soldServings, 60);
          await tx.posSale.update({
            where: { id: first.id },
            data: { status: "VOIDED", voidedAt: new Date() },
          });
          const after = await report();
          assert.deepEqual(
            after.rows.map((row) => row.usedQuantity),
            [3, 1.5, 0.2],
          );
          assert.equal(after.rows[0].remainingQuantity, 147);
          assert.equal(after.rows[0].dishes[0].soldServings, 10);
          data.materials.push({
            id: "beef",
            name: "Үхрийн мах",
            unit: "kg",
            openingQuantity: 40,
            receipts: [],
            usages: [],
          });
          data.posBindings![0].materialId = "beef";
          await tx.restaurantSupplyMonth.update({
            where: {
              organizationId_month: {
                organizationId: organization.id,
                month: "2026-11",
              },
            },
            data: { data: supplyJson() },
          });
          const beefSale = await createSale(5);
          await capturePosRecipeSnapshots(tx, beefSale.id);
          const rebound = await report();
          assert.equal(
            rebound.rows[0].remainingQuantity,
            147,
            "changing future bindings cannot move earlier mutton consumption",
          );
          assert.equal(rebound.rows[3].remainingQuantity, 38.5);
          // Sales made before materials were linked can be bound once, then retain that identity.
          await tx.restaurantSupplyMonth.update({
            where: {
              organizationId_month: {
                organizationId: organization.id,
                month: "2026-11",
              },
            },
            data: { data: { materials: [] } },
          });
          const pending = await createSale(1);
          await capturePosRecipeSnapshots(tx, pending.id);
          await bindPendingRecipeSnapshots(
            tx,
            organization.id,
            "2026-11",
            data,
          );
          data.posBindings![0].materialId = "meat";
          const resolved = await report();
          assert.equal(resolved.rows[0].remainingQuantity, 147);
          assert.equal(resolved.rows[3].remainingQuantity, 38.2);
          // Directly selected supply materials require no separate monthly POS mapping.
          const directRecipe = structuredClone(changed);
          directRecipe.ingredients.forEach((ingredient, index) => {
            ingredient.materialId = ["beef", "rice", "oil"][index];
          });
          data.posBindings = [];
          await tx.restaurantSupplyMonth.update({
            where: {
              organizationId_month: {
                organizationId: organization.id,
                month: "2026-11",
              },
            },
            data: { data: supplyJson() },
          });
          await tx.productRecipe.update({
            where: { productId: product.id },
            data: { data: recipeJson(directRecipe), version: { increment: 1 } },
          });
          const directSale = await createSale(2);
          await capturePosRecipeSnapshots(tx, directSale.id);
          const direct = await report();
          assert.equal(direct.rows[0].remainingQuantity, 147);
          assert.equal(direct.rows[3].remainingQuantity, 37.6);
          assert.ok(
            direct.source.posSources.every(
              (source) => source.bindings !== null,
            ),
          );
          throw rollback;
        },
        { timeout: 20000 },
      );
    } catch (error) {
      if (error !== rollback) throw error;
    }
  },
);
