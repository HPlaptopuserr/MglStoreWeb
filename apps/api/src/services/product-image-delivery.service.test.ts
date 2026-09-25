import assert from "node:assert/strict";
import test from "node:test";
import { ProductImageDeliveryError } from "../lib/product-image-errors";
import { loadProductImage } from "./product-image-delivery.service";

const STORAGE = "https://current-project.supabase.co";
const IMAGE = `${STORAGE}/storage/v1/object/public/product-images/item.webp`;

test("DNS failures produce an actionable, sanitized response and log diagnostics", async () => {
  const fetchImage: typeof fetch = async () => {
    const dnsError = Object.assign(
      new Error("private storage URL and credentials"),
      { code: "ENOTFOUND" },
    );
    throw Object.assign(new TypeError("fetch failed"), { cause: dnsError });
  };
  await assert.rejects(
    loadProductImage(IMAGE, STORAGE, fetchImage),
    (error: unknown) => {
      assert.ok(error instanceof ProductImageDeliveryError);
      assert.equal(error.status, 503);
      assert.equal(error.code, "IMAGE_STORAGE_DNS_ERROR");
      assert.deepEqual(error.diagnostics, { networkCode: "ENOTFOUND" });
      const response = error.toResponse("request-123");
      assert.equal(response.requestId, "request-123");
      assert.equal(response.retryable, true);
      assert.match(response.message, /DNS/);
      assert.match(response.action, /Supabase/);
      assert.doesNotMatch(
        JSON.stringify(response),
        /private|credentials|https:/,
      );
      assert.notEqual(response.code, "IMAGE_STORAGE_PAYMENT_REQUIRED");
      return true;
    },
  );
});

test("Supabase DatabaseTimeout (544) is distinguished from other storage outages", async () => {
  const fetchImage: typeof fetch = async () =>
    new Response(
      JSON.stringify({ statusCode: "544", error: "DatabaseTimeout" }),
      { status: 544, headers: { "Content-Type": "application/json" } },
    );
  await assert.rejects(loadProductImage(IMAGE, STORAGE, fetchImage), {
    code: "IMAGE_STORAGE_TIMEOUT",
    status: 504,
    diagnostics: { upstreamStatus: 544 },
  });
});

test("request timeouts and connection timeouts have the same useful error code", async () => {
  for (const cause of [
    new DOMException("Aborted", "AbortError"),
    Object.assign(new Error("connect timeout"), {
      code: "UND_ERR_CONNECT_TIMEOUT",
    }),
  ]) {
    const fetchImage: typeof fetch = async () => {
      throw cause;
    };
    await assert.rejects(loadProductImage(IMAGE, STORAGE, fetchImage), {
      code: "IMAGE_STORAGE_TIMEOUT",
      status: 504,
    });
  }
});

test("missing files, denied access, billing and rate limits remain distinguishable", async () => {
  const cases = [
    [404, "IMAGE_NOT_FOUND"],
    [401, "IMAGE_STORAGE_ACCESS_DENIED"],
    [403, "IMAGE_STORAGE_ACCESS_DENIED"],
    [402, "IMAGE_STORAGE_PAYMENT_REQUIRED"],
    [429, "IMAGE_STORAGE_RATE_LIMITED"],
    [503, "IMAGE_STORAGE_UNAVAILABLE"],
  ] as const;
  for (const [status, code] of cases) {
    const fetchImage: typeof fetch = async () =>
      new Response("provider error", { status });
    await assert.rejects(loadProductImage(IMAGE, STORAGE, fetchImage), {
      code,
    });
  }
});

test("configuration and source errors are diagnosed before requesting storage", async () => {
  const unexpectedFetch: typeof fetch = async () => {
    throw new Error("must not fetch");
  };
  await assert.rejects(loadProductImage(null, STORAGE, unexpectedFetch), {
    code: "IMAGE_NOT_FOUND",
  });
  await assert.rejects(loadProductImage(IMAGE, undefined, unexpectedFetch), {
    code: "IMAGE_STORAGE_NOT_CONFIGURED",
  });
  await assert.rejects(
    loadProductImage(
      "https://untrusted.example/image.jpg",
      STORAGE,
      unexpectedFetch,
    ),
    { code: "IMAGE_SOURCE_INVALID" },
  );
  await assert.rejects(
    loadProductImage("data:image/png;base64,!!!", STORAGE, unexpectedFetch),
    { code: "IMAGE_SOURCE_INVALID" },
  );
  const inline = await loadProductImage(
    "data:image/png;base64,aGVsbG8=",
    undefined,
    unexpectedFetch,
  );
  assert.equal(inline.contentType, "image/png");
  assert.equal(inline.body.toString(), "hello");
});

test("successful image requests preserve bytes, MIME type and timeout/redirect protection", async () => {
  const body = Buffer.from([82, 73, 70, 70]);
  const fetchImage: typeof fetch = async (input, init) => {
    assert.equal(String(input), IMAGE);
    assert.equal(init?.redirect, "error");
    assert.ok(init?.signal instanceof AbortSignal);
    return new Response(body, { headers: { "Content-Type": "image/webp" } });
  };
  const image = await loadProductImage(IMAGE, STORAGE, fetchImage);
  assert.equal(image.contentType, "image/webp");
  assert.deepEqual(image.body, body);
});

test("non-image, empty, declared oversized and streamed oversized responses fail clearly", async () => {
  const cases = [
    [
      () =>
        new Response("<html>Unavailable</html>", {
          headers: { "Content-Type": "text/html" },
        }),
      "IMAGE_RESPONSE_INVALID",
    ],
    [
      () => new Response(null, { headers: { "Content-Type": "image/webp" } }),
      "IMAGE_NOT_FOUND",
    ],
    [
      () =>
        new Response("image", {
          headers: {
            "Content-Type": "image/webp",
            "Content-Length": String(9 * 1024 * 1024),
          },
        }),
      "IMAGE_TOO_LARGE",
    ],
    [
      () =>
        new Response(new Uint8Array(8 * 1024 * 1024 + 1), {
          headers: { "Content-Type": "image/webp" },
        }),
      "IMAGE_TOO_LARGE",
    ],
  ] as const;
  for (const [response, code] of cases) {
    const fetchImage: typeof fetch = async () => response();
    await assert.rejects(loadProductImage(IMAGE, STORAGE, fetchImage), {
      code,
    });
  }
});
