const assert = require("node:assert/strict");
const test = require("node:test");
const { missingModelColumns } = require("./check-runtime-schema.cjs");

const models = [
  {
    name: "Dividend",
    dbName: "WarehouseInvestorDividend",
    fields: [
      { name: "id", kind: "scalar" },
      { name: "amount", dbName: "amount_mnt", kind: "scalar" },
      { name: "decision", kind: "object" },
    ],
  },
];

test("deployment fails for a missing required table or column", () => {
  assert.deepEqual(missingModelColumns(models, []), [
    "WarehouseInvestorDividend",
  ]);
  assert.deepEqual(
    missingModelColumns(models, [
      { table_name: "WarehouseInvestorDividend", column_name: "id" },
    ]),
    ["WarehouseInvestorDividend.amount_mnt"],
  );
});

test("deployment accepts mapped columns and ignores relation fields", () => {
  assert.deepEqual(
    missingModelColumns(
      models,
      ["id", "amount_mnt"].map((column_name) => ({
        table_name: "WarehouseInvestorDividend",
        column_name,
      })),
    ),
    [],
  );
});
