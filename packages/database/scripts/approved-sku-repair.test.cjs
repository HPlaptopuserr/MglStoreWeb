const assert = require("node:assert/strict");
const test = require("node:test");
const {
  approvedSkuPlan,
  projectedApprovedSkuDuplicates,
} = require("./approved-sku-repair.cjs");

test("the repair stays within the five owner-approved product IDs and replacement SKUs", () => {
  const plan = approvedSkuPlan();
  assert.deepEqual(
    Object.fromEntries(plan.map((row) => [row.id, row.new_sku])),
    {
      "cc93cd74-e35b-4290-bdd8-d319e1dbe27e": "FRC-XXX-002",
      "bc7cf9e8-c74b-4c19-a049-39b28fc9419d": "FRP-XXX-003",
      "5efbe0f7-ed84-4f94-aef0-94aa7d8c2449": "SB/-NZN-002",
      "e1e7970b-5230-4cd5-a2d9-bdd66decb91d": "TMT-MSB-002",
      "d5a48580-2aba-4137-86eb-3b31caecc188": "VBC-MGL-002",
    },
  );
  assert.ok(
    plan.every(
      (row) => row.warehouse_id === "5424ab70-0768-498a-b0f7-bb7163b15937",
    ),
  );
});

test("an applied repair is never projected again", async () => {
  let calls = 0;
  const result = await projectedApprovedSkuDuplicates({
    $queryRaw: async () => {
      assert.equal(++calls, 1);
      return [{ id: "already-applied" }];
    },
  });
  assert.equal(result, null);
});

test("changed identities stop before projected duplicate checks", async () => {
  let calls = 0;
  await assert.rejects(
    projectedApprovedSkuDuplicates({
      $queryRaw: async () => {
        calls++;
        return calls === 1 ? [] : [{ count: 1 }];
      },
    }),
    /no longer matches/,
  );
  assert.equal(calls, 2);
});

test("unrelated duplicate groups remain visible after the approved projection", async () => {
  const responses = [[], [{ count: 0 }], [{ count: 2 }]];
  assert.equal(
    await projectedApprovedSkuDuplicates({
      $queryRaw: async () => responses.shift(),
    }),
    2,
  );
});
