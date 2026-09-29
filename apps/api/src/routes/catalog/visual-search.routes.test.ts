import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import express from "express";
import { createVisualSearchRouter } from "./visual-search.routes";
import { VisualSearchError } from "../../services/visual-search/visual-search-encoder";

async function serve(router: express.Router) {
  const app = express();
  app.use("/api", router);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/catalog/visual-search`,
    close: () => {
      server.closeAllConnections();
      server.close();
    },
  };
}
const form = (bytes = new Uint8Array([1, 2, 3]), name = "image") => {
  const body = new FormData();
  body.append(name, new Blob([bytes]), "photo.png");
  return body;
};

test("multipart single image reaches search; malformed, extra and oversized uploads never do", async () => {
  let calls = 0;
  const app = await serve(
    createVisualSearchRouter(
      async () => {
        calls++;
        return {
          productIds: ["p"],
          indexedProducts: 1,
          partial: false,
          indexedAt: "date",
        };
      },
      () => true,
    ),
  );
  try {
    const response = await fetch(app.url, { method: "POST", body: form() });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual((await response.json()).productIds, ["p"]);
    assert.equal(
      (await fetch(app.url, { method: "POST", body: form(undefined, "wrong") }))
        .status,
      400,
    );
    assert.equal(
      (
        await fetch(app.url, {
          method: "POST",
          body: form(new Uint8Array(5 * 1024 * 1024 + 1)),
        })
      ).status,
      413,
    );
    const extra = form();
    extra.append("other", new Blob(["x"]), "x.png");
    assert.equal(
      (await fetch(app.url, { method: "POST", body: extra })).status,
      400,
    );
    assert.equal((await fetch(app.url, { method: "POST" })).status, 400);
    assert.equal(calls, 1);
  } finally {
    app.close();
  }
});
test("disabled and model errors are safe and actionable without exposing internal paths", async () => {
  const disabled = await serve(
    createVisualSearchRouter(
      async () => {
        throw new Error("must not call");
      },
      () => false,
    ),
  );
  try {
    assert.equal(
      (await fetch(disabled.url, { method: "POST", body: form() })).status,
      503,
    );
  } finally {
    disabled.close();
  }
  const unavailable = await serve(
    createVisualSearchRouter(
      async () => {
        throw new VisualSearchError(
          503,
          "VISUAL_SEARCH_NOT_READY",
          "Бэлтгэгдэж байна",
        );
      },
      () => true,
    ),
  );
  try {
    const response = await fetch(unavailable.url, {
      method: "POST",
      body: form(),
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, "VISUAL_SEARCH_NOT_READY");
  } finally {
    unavailable.close();
  }
});

test("capability prevents uploads when disabled; v2 validates refinement fields and preserves legacy contract", async () => {
  const seen: string[] = [];
  const app = await serve(
    createVisualSearchRouter(
      async (_bytes, options) => {
        seen.push(options!.query);
        return {
          productIds: [],
          indexedProducts: 0,
          partial: false,
          indexedAt: "date",
          products: [],
          outcome: "no_filter_match",
        };
      },
      () => true,
    ),
  );
  try {
    const capability = await fetch(
      app.url.replace("visual-search", "search/capabilities"),
    );
    assert.equal(capability.headers.get("cache-control"), "no-store");
    assert.equal((await capability.json()).image.hybrid, true);
    const data = form();
    data.append("query", "хар гутал");
    data.append("responseVersion", "2");
    data.append("priceMax", "90000");
    data.append("inStock", "true");
    data.append("sort", "price_asc");
    const result = await fetch(app.url, { method: "POST", body: data });
    assert.equal(result.status, 200);
    assert.equal((await result.json()).outcome, "no_filter_match");
    assert.deepEqual(seen, ["хар гутал"]);
    const duplicate = form();
    duplicate.append("query", "one");
    duplicate.append("query", "two");
    assert.equal(
      (await fetch(app.url, { method: "POST", body: duplicate })).status,
      400,
    );
    assert.equal(seen.length, 1);
  } finally {
    app.close();
  }
});

test("rate-limit responses have no-store, request id, retryability and Retry-After", async () => {
  const app = await serve(
    createVisualSearchRouter(
      async () => ({
        productIds: [],
        indexedProducts: 0,
        partial: false,
        indexedAt: "date",
      }),
      () => true,
    ),
  );
  try {
    for (let i = 0; i < 12; i++)
      await fetch(app.url, { method: "POST", body: form() });
    const response = await fetch(app.url, { method: "POST", body: form() });
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.ok(response.headers.get("retry-after"));
    const body = await response.json();
    assert.equal(body.retryable, true);
    assert.equal(body.requestId, response.headers.get("x-request-id"));
  } finally {
    app.close();
  }
});
