import assert from "node:assert/strict";
import test from "node:test";
import { canSimulateLocalPosPayment } from "./local-pos-payment-simulation";

const local = {
  enabled: true,
  localDev: true,
  environment: "development",
  databaseUrl: "postgresql://localhost/test",
  hostname: "localhost",
  remoteAddress: "::1",
  registerId: "local-fixture-register",
};
test("explicit local fixture mode accepts local requests only", () =>
  assert.equal(canSimulateLocalPosPayment(local), true));
test("simulation cannot approve production, staging, remote databases, real registers or remote requests", () => {
  for (const change of [
    { enabled: false },
    { localDev: false },
    { environment: "production" },
    { environment: "staging" },
    { environment: "test" },
    { databaseUrl: "postgresql://remote.example/production" },
    { databaseUrl: "invalid" },
    { hostname: "vendor.mglstore.mn" },
    { remoteAddress: "192.168.1.10" },
    { registerId: "real-register" },
    { registerId: null },
  ])
    assert.equal(
      canSimulateLocalPosPayment({ ...local, ...change }),
      false,
      JSON.stringify(change),
    );
});
