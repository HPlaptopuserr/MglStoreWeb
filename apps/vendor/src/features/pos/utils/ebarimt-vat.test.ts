import assert from "node:assert/strict";
import test from "node:test";
import { allocateEbarimtVat } from "./ebarimt-vat";

const rejectedReceipts: Array<[number[], number]> = [
  [[1455, 2355, 1355], 469.55],
  [[4655, 2655], 664.55],
  [[5755, 4955, 2355], 1187.73],
  [[2555, 12955, 12555, 8655, 4955, 5955, 295], 4356.82],
  [[4855, 5710, 3555], 1283.64],
  [[3955, 4555, 14955], 2133.18],
  [[5855, 4955, 13710, 4855], 2670.45],
  [[8555, 12955], 1955.45],
  [[5955, 5455, 8955, 2655, 7955, 10955, 295], 3838.64],
  [[2555, 4955], 682.73],
  [[5955, 7955], 1264.55],
  [[1355, 5655, 2955, 1655, 10910, 15955, 12555, 14865], 5991.36],
  [[2555, 655, 1965], 470.45],
  [
    [
      17955, 12555, 32955, 15955, 13955, 5955, 9955, 8955, 6455, 3855, 6855,
      295,
    ],
    12336.36,
  ],
  [[6555, 3910, 3910, 4655, 22955, 4955, 19910, 11455, 11455, 885], 8240.45],
  [[9955, 11555, 12555, 295], 3123.64],
  [[2455, 7455, 6355, 295], 1505.45],
  [[5955, 5955, 900], 1164.55],
  [[2555, 1455], 364.55],
  [[32730, 2655, 2255], 3421.82],
  [[4955, 5955, 2655, 4955, 13110, 195, 2200], 3093.18],
  [[1965, 6555, 955, 6500, 2655, 17455, 5865, 295], 3840.45],
  [[3955, 3955, 2555, 1955], 1129.09],
  [[13955, 4955, 5955, 14565, 5755, 100], 4116.82],
  [[5910, 4955], 987.73],
];

test("all 25 real rejected totals match PosAPI's expected VAT and item sums", () => {
  assert.equal(rejectedReceipts.length, 25);
  for (const [amounts, expected] of rejectedReceipts) {
    const items = amounts.map((totalAmount) => ({
      totalAmount,
      totalCityTax: 0,
    }));
    const result = allocateEbarimtVat(items, true, "VAT_ABLE");
    assert.equal(result.totalVAT, expected);
    assert.equal(
      result.itemVAT.reduce((sum, amount) => sum + Math.round(amount * 100), 0),
      Math.round(expected * 100),
    );
    result.itemVAT.forEach((vat, index) =>
      assert.ok(Math.abs(vat - amounts[index] / 11) < 0.011),
    );
    assert.deepEqual(
      items.map((item) => item.totalAmount),
      amounts,
    );
  }
});

test("non-VAT merchants and exempt tax groups retain zero VAT", () => {
  for (const taxType of ["VAT_FREE", "VAT_ZERO", "NOT_VAT"]) {
    assert.deepEqual(
      allocateEbarimtVat(
        [{ totalAmount: 10865, totalCityTax: 0 }],
        true,
        taxType,
      ),
      { totalVAT: 0, itemVAT: [0] },
    );
  }
  assert.deepEqual(
    allocateEbarimtVat(
      [{ totalAmount: 10865, totalCityTax: 0 }],
      false,
      "VAT_ABLE",
    ),
    { totalVAT: 0, itemVAT: [0] },
  );
});

test("VAT excludes city tax from the final discounted line amount", () => {
  assert.deepEqual(
    allocateEbarimtVat(
      [{ totalAmount: 1120, totalCityTax: 20 }],
      true,
      "VAT_ABLE",
    ),
    { totalVAT: 100, itemVAT: [100] },
  );
  assert.deepEqual(
    allocateEbarimtVat(
      [{ totalAmount: 1008, totalCityTax: 18 }],
      true,
      "VAT_ABLE",
    ),
    { totalVAT: 90, itemVAT: [90] },
  );
});

test("single rows, zero totals and fractional weighted amounts preserve cents", () => {
  for (const totalAmount of [0, 0.01, 1.23, 2955, 12345.67, 1000000000]) {
    const result = allocateEbarimtVat(
      [{ totalAmount, totalCityTax: 0 }],
      true,
      "VAT_ABLE",
    );
    assert.equal(
      result.totalVAT,
      Math.round(Math.round(totalAmount * 100) / 11) / 100,
    );
    assert.deepEqual(result.itemVAT, [result.totalVAT]);
  }
  assert.deepEqual(allocateEbarimtVat([], true, "VAT_ABLE"), {
    totalVAT: 0,
    itemVAT: [],
  });
});

test("large baskets remain deterministic, balanced and within one cent per line", () => {
  for (let size = 1; size <= 100; size++) {
    const items = Array.from({ length: size }, (_, i) => ({
      totalAmount: ((i * 7919 + size * 1337) % 1000000) / 100,
      totalCityTax: 0,
    }));
    const result = allocateEbarimtVat(items, true, "VAT_ABLE");
    assert.deepEqual(allocateEbarimtVat(items, true, "VAT_ABLE"), result);
    assert.equal(
      result.itemVAT.reduce((sum, amount) => sum + Math.round(amount * 100), 0),
      Math.round(result.totalVAT * 100),
    );
    result.itemVAT.forEach((vat, index) =>
      assert.ok(Math.abs(vat - items[index].totalAmount / 11) < 0.011),
    );
  }
});

test("invalid financial amounts fail before contacting PosAPI", () => {
  for (const totalAmount of [NaN, Infinity, -1, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() =>
      allocateEbarimtVat([{ totalAmount, totalCityTax: 0 }], true, "VAT_ABLE"),
    );
  }
  assert.throws(() =>
    allocateEbarimtVat([{ totalAmount: 1, totalCityTax: 2 }], true, "VAT_ABLE"),
  );
});
