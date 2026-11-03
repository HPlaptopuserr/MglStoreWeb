import test from "node:test";
import assert from "node:assert/strict";
import { useLocalSystemQrCatalog } from "./systemqr-local-catalog";
test("offline catalog requires explicit opt-in and a local development database", () => {
  const env = {
    NODE_ENV: "development",
    MGL_LOCAL_DEV: "true",
    SYSTEMQR_LOCAL_CATALOG: "true",
    DATABASE_URL: "postgresql://localhost/mglstore",
  };
  assert.equal(useLocalSystemQrCatalog(env), true);
  for (const override of [
    { NODE_ENV: "production" },
    { MGL_LOCAL_DEV: "false" },
    { SYSTEMQR_LOCAL_CATALOG: "false" },
    { DATABASE_URL: "postgresql://remote.example/prod" },
    { DATABASE_URL: "" },
  ]) {
    assert.equal(useLocalSystemQrCatalog({ ...env, ...override }), false);
  }
});
