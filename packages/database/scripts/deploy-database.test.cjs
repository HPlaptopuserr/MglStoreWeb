const assert = require("node:assert/strict");
const test = require("node:test");
const { releaseDatabase } = require("./deploy-database.cjs");

function steps(failure) {
  const calls = [];
  const run = async (name) => {
    calls.push(name);
    if (failure === name) throw new Error(name);
  };
  return {
    calls,
    dependencies: {
      audit: ({ allowPending }) =>
        run(allowPending ? "history-before" : "history-after"),
      migrate: () => run("migrate"),
      assertSchema: () => run("schema"),
      assertRuntime: () => run("runtime"),
    },
  };
}

test("release checks history before migrations and verifies history, full schema, and runtime afterwards", async () => {
  const { calls, dependencies } = steps();
  await releaseDatabase(dependencies);
  assert.deepEqual(calls, [
    "history-before",
    "migrate",
    "history-after",
    "schema",
    "runtime",
  ]);
});

for (const failure of [
  "history-before",
  "migrate",
  "history-after",
  "schema",
  "runtime",
]) {
  test(`release stops at ${failure} failure`, async () => {
    const { calls, dependencies } = steps(failure);
    await assert.rejects(releaseDatabase(dependencies), new RegExp(failure));
    assert.equal(calls.at(-1), failure);
  });
}
