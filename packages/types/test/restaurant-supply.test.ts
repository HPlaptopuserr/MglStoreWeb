import assert from "node:assert/strict";
import test from "node:test";
import {
  isSupplyMonth,
  parseSupplyMonth,
  summarizeSupplyMonth,
  type SupplyMonth,
} from "../src/domain/restaurant-supply";
const data = (): SupplyMonth => ({
  materials: [
    {
      id: "mutton",
      name: "Хонины мах",
      unit: "kg",
      openingQuantity: 0,
      receipts: [
        {
          id: "receipt",
          date: "2026-11-02",
          quantity: 150,
          unitPrice: 18000,
          supplier: "Supplier",
        },
      ],
      usages: [
        {
          id: "use1",
          date: "2026-11-03",
          quantity: 60,
          productId: "buuz",
          dishName: "Бууз",
        },
        {
          id: "use2",
          date: "2026-11-04",
          quantity: 40,
          productId: null,
          dishName: "Хуушуур",
        },
        {
          id: "use3",
          date: "2026-11-04",
          quantity: 30,
          productId: null,
          dishName: "Цуйван",
        },
      ],
    },
  ],
});
test("150 kg received minus 130 kg used leaves 20 kg with a dish breakdown", () => {
  assert.equal(parseSupplyMonth("2026-11", data()).ok, true);
  const row = summarizeSupplyMonth(data())[0];
  assert.equal(row.receivedQuantity, 150);
  assert.equal(row.usedQuantity, 130);
  assert.equal(row.remainingQuantity, 20);
  assert.equal(row.purchaseCost, 2700000);
  assert.deepEqual(
    row.dishes.map((dish) => [dish.name, dish.quantity]),
    [
      ["Бууз", 60],
      ["Хуушуур", 40],
      ["Цуйван", 30],
    ],
  );
});
test("opening quantities and multiple purchase prices are included without mixing units", () => {
  const value = data();
  value.materials[0].openingQuantity = 10;
  value.materials[0].receipts.push({
    id: "receipt2",
    date: "2026-11-10",
    quantity: 20,
    unitPrice: 20000,
    supplier: "",
  });
  value.materials.push({
    id: "beef",
    name: "Үхрийн мах",
    unit: "kg",
    openingQuantity: 0,
    receipts: [
      {
        id: "b1",
        date: "2026-11-01",
        quantity: 40,
        unitPrice: 22000,
        supplier: "",
      },
    ],
    usages: [],
  });
  const [mutton, beef] = summarizeSupplyMonth(value);
  assert.equal(mutton.remainingQuantity, 50);
  assert.equal(mutton.purchaseCost, 3100000);
  assert.equal(beef.remainingQuantity, 40);
  assert.equal(beef.purchaseCost, 880000);
});
test("small coffee consumption preserves fractional grams and aggregates repeated dishes", () => {
  const value = data();
  value.materials[0].receipts[0].quantity = 1;
  value.materials[0].usages = Array.from({ length: 3 }, (_, i) => ({
    id: `c${i}`,
    date: "2026-11-02",
    productId: "latte",
    dishName: "Latte",
    quantity: 0.0177,
  }));
  assert.equal(parseSupplyMonth("2026-11", value).ok, true);
  assert.equal(summarizeSupplyMonth(value)[0].remainingQuantity, 0.9469);
  assert.equal(summarizeSupplyMonth(value)[0].dishes[0].quantity, 0.0531);
});
test("missing receipts remain visible as a negative balance instead of a clamped zero", () => {
  const value = data();
  value.materials[0].receipts = [];
  assert.equal(summarizeSupplyMonth(value)[0].remainingQuantity, -130);
});
test("invalid dates, duplicate materials, IDs and invalid prices cannot be saved", () => {
  for (const mutate of [
    (value: SupplyMonth) => {
      value.materials[0].receipts[0].date = "2026-12-01";
    },
    (value: SupplyMonth) => {
      value.materials[0].receipts[0].date = "2026-11-31";
    },
    (value: SupplyMonth) => {
      value.materials[0].receipts[0].unitPrice = Number.NaN;
    },
    (value: SupplyMonth) => {
      value.materials[0].receipts[0].unitPrice = -1;
    },
    (value: SupplyMonth) => {
      value.materials[0].usages[0].quantity = 0;
    },
    (value: SupplyMonth) => {
      value.materials[0].usages[0].id = "receipt";
    },
    (value: SupplyMonth) => {
      value.materials.push({
        ...value.materials[0],
        id: "other",
        name: " хонины   мах ",
        receipts: [],
        usages: [],
      });
    },
    (value: SupplyMonth) => {
      value.materials[0].unit = "pcs";
      value.materials[0].receipts[0].quantity = 1.5;
    },
  ]) {
    const value = data();
    mutate(value);
    assert.equal(parseSupplyMonth("2026-11", value).ok, false);
  }
  assert.equal(isSupplyMonth("2026-13"), false);
  assert.equal(isSupplyMonth("2026-11"), true);
});

test("opening stock purchase prices value existing materials without inventing new monthly receipts", () => {
  const value = data();
  const material = value.materials[0];
  material.openingQuantity = 60;
  material.openingUnitPrice = 18000;
  material.receipts = [];
  material.usages = [];
  const parsed = parseSupplyMonth("2026-11", value);
  assert.equal(parsed.ok, true);
  const summary = summarizeSupplyMonth(value)[0];
  assert.equal(summary.unitCost, 18000);
  assert.equal(summary.stockCost, 1080000);
  assert.equal(summary.purchaseCost, 0);
  material.receipts = [
    {
      id: "r",
      date: "2026-11-02",
      quantity: 40,
      unitPrice: 20000,
      supplier: "",
    },
  ];
  assert.equal(summarizeSupplyMonth(value)[0].unitCost, 18800);
  assert.equal(summarizeSupplyMonth(value)[0].stockCost, 1880000);
});
test("unknown opening prices stay unknown and explicit free prices remain zero", () => {
  const value = data();
  value.materials[0].openingQuantity = 60;
  assert.equal(summarizeSupplyMonth(value)[0].unitCost, null);
  value.materials[0].openingUnitPrice = null;
  assert.equal(summarizeSupplyMonth(value)[0].stockCost, null);
  value.materials[0].openingUnitPrice = 0;
  value.materials[0].receipts = [];
  assert.equal(summarizeSupplyMonth(value)[0].unitCost, 0);
  for (const price of [-1, Infinity, NaN, 1.001, 1000000001, "18000"]) {
    assert.equal(
      parseSupplyMonth("2026-11", {
        materials: [{ ...value.materials[0], openingUnitPrice: price }],
      }).ok,
      false,
    );
  }
});
