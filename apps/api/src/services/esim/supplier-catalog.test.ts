import test from "node:test";
import assert from "node:assert/strict";
import {
  airaloCatalog,
  esimAccessCatalog,
  esimGoCatalog,
} from "./supplier-catalog";
import type { Fetcher } from "./supplier-http";

function fake(
  handler: (url: string, init: RequestInit) => unknown | Promise<unknown>,
): Fetcher {
  return async (input, init) => {
    assert.equal(init?.redirect, "error");
    assert.ok(init?.signal);
    return Response.json(await handler(String(input), init ?? {}));
  };
}

test("Access uses country filter and distinguishes application rejection from HTTP success", async () => {
  const supplier = esimAccessCatalog(
    "test-key",
    fake((url, init) => {
      assert.equal(url, "https://api.esimaccess.com/api/v1/open/package/list");
      assert.equal(new Headers(init.headers).get("RT-AccessCode"), "test-key");
      assert.deepEqual(JSON.parse(String(init.body)), {
        locationCode: "CN",
        type: "BASE",
      });
      return {
        success: true,
        obj: { packageList: [{ packageCode: "test-cn" }] },
      };
    }),
  );
  assert.equal((await supplier.fetchPage("cn")).records.length, 1);
  await assert.rejects(
    esimAccessCatalog(
      "key",
      fake(() => ({ success: false })),
    ).fetchPage("CN"),
    /rejected/,
  );
});

test("Go preserves pagination and country scope", async () => {
  const supplier = esimGoCatalog(
    "test-key",
    fake((url, init) => {
      assert.equal(new URL(url).searchParams.get("countries"), "CN");
      assert.equal(new URL(url).searchParams.get("page"), "2");
      assert.equal(new Headers(init.headers).get("X-API-Key"), "test-key");
      return Array.from({ length: 50 }, (_, index) => ({
        name: `plan-${index}`,
      }));
    }),
  );
  assert.equal((await supplier.fetchPage("CN", 2)).nextPage, 3);
});

test("Airalo shares authentication across concurrent catalog requests and never follows next URL", async () => {
  let tokenCalls = 0;
  const supplier = airaloCatalog(
    "client",
    "secret",
    fake((url, init) => {
      if (url.endsWith("/token")) {
        tokenCalls++;
        assert.equal(
          new URLSearchParams(String(init.body)).get("grant_type"),
          "client_credentials",
        );
        return { data: { access_token: "test-token", expires_in: 86400 } };
      }
      assert.equal(new URL(url).hostname, "partners-api.airalo.com");
      assert.equal(new URL(url).searchParams.get("filter[country]"), "CN");
      assert.equal(
        new Headers(init.headers).get("Authorization"),
        "Bearer test-token",
      );
      return { data: [], links: { next: "https://untrusted.invalid/page2" } };
    }),
  );
  const pages = await Promise.all([
    supplier.fetchPage("CN"),
    supplier.fetchPage("CN"),
  ]);
  assert.equal(tokenCalls, 1);
  assert.equal(pages[0]?.nextPage, 2);
});

test("invalid input and missing credentials fail before network access", async () => {
  const supplier = esimGoCatalog(
    "key",
    fake(() => assert.fail("network called")),
  );
  await assert.rejects(supplier.fetchPage("../"), /country/);
  await assert.rejects(supplier.fetchPage("CN", 0), /page/);
  assert.throws(() => esimGoCatalog(" "), /missing/);
});

test("HTTP error does not disclose upstream body or retry a rejected request", async () => {
  let calls = 0;
  const fetcher: Fetcher = async () => {
    calls++;
    return new Response("sensitive-body", { status: 429 });
  };
  await assert.rejects(esimGoCatalog("key", fetcher).fetchPage("CN"), {
    message: "Supplier HTTP 429",
  });
  assert.equal(calls, 1);
});

test("invalid catalog schema is rejected instead of appearing empty", async () => {
  await assert.rejects(
    esimGoCatalog(
      "key",
      fake(() => ({ bundles: null })),
    ).fetchPage("CN"),
    /invalid catalog/,
  );
});
