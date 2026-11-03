import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { prisma } from "@mgl/database";
import { isPosActivationEnabled, readOpenPosOrganizationIds } from "./pos-activation.service";

const restores: Array<() => void> = [];
function stubSettings(read: (query: unknown) => Promise<{ key: string; value: string }[]>) {
  const previous: unknown = Reflect.get(prisma.siteSetting, "findMany");
  Reflect.set(prisma.siteSetting, "findMany", mock.fn(read));
  restores.push(() => Reflect.set(prisma.siteSetting, "findMany", previous));
}
afterEach(() => { while (restores.length) restores.pop()?.(); });

test("only explicit POS activation values open the mini app", () => {
  for (const value of ["true", "1", "on", "yes", " TRUE "]) assert.equal(isPosActivationEnabled(value), true);
  for (const value of [undefined, null, "", "false", "0", "off", "unknown"]) assert.equal(isPosActivationEnabled(value), false);
});
test("activation is scoped and read again after every administrator toggle", async () => {
  let enabled = true;
  let reads = 0;
  stubSettings(async (query) => {
    reads++;
    assert.deepEqual(query, {where: {key: {in: ["pos-enabled-on", "pos-enabled-off"]}}, select: {key: true, value: true}});
    return [{key: "pos-enabled-on", value: String(enabled)}, {key: "pos-enabled-off", value: "false"}];
  });
  assert.deepEqual([...await readOpenPosOrganizationIds(["on", "off", "on"])], ["on"]);
  enabled = false;
  assert.deepEqual([...await readOpenPosOrganizationIds(["on", "off"])], []);
  assert.equal(reads, 2);
});
test("missing settings and missing organizations stay closed", async () => {
  let reads = 0;
  stubSettings(async () => { reads++; return []; });
  assert.deepEqual([...await readOpenPosOrganizationIds([])], []);
  assert.equal(reads, 0);
  assert.deepEqual([...await readOpenPosOrganizationIds(["missing"])], []);
  assert.equal(reads, 1);
});
