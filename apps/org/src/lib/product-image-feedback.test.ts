import assert from "node:assert/strict";
import { after, test } from "node:test";
import {
  DEFAULT_IMAGE_FAILURE,
  diagnoseProductImageFailure,
  retryProductImageUrl,
} from "./product-image-feedback";
import { API } from "./api";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { location: { href: "http://localhost:3004/dashboard/self-service" } },
});
after(() => {
  if (originalWindow)
    Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

const imageUrl = `${API}/products/product-id/primary-image`;

test("image failure diagnostics read structured API errors", async (t) => {
  const payload = {
    code: "IMAGE_STORAGE_TIMEOUT",
    message: "Зураг хадгалах сервер хугацаандаа хариу өгсөнгүй.",
    action: "Түр хүлээгээд дахин оролдоно уу.",
    retryable: true,
    requestId: "request-123",
  };
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(JSON.stringify(payload), {
        status: 504,
        headers: { "Content-Type": "application/json" },
      }),
  );
  assert.deepEqual(
    await diagnoseProductImageFailure(imageUrl, new AbortController().signal),
    payload,
  );
});

test("external image failures do not trigger diagnostic requests", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("must not fetch");
  });
  const failure = await diagnoseProductImageFailure(
    "https://images.example/item.webp",
    new AbortController().signal,
  );
  assert.deepEqual(failure, DEFAULT_IMAGE_FAILURE);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("offline, legacy HTML and malformed JSON responses have a safe fallback", async (t) => {
  for (const response of [
    () =>
      new Response("bad gateway", {
        status: 502,
        headers: { "Content-Type": "text/html" },
      }),
    () =>
      new Response("not JSON", {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }),
    () =>
      new Response(JSON.stringify({ message: "unrecognized server message" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }),
    () => {
      throw new TypeError("Failed to fetch");
    },
  ]) {
    t.mock.method(globalThis, "fetch", async () => response());
    assert.deepEqual(
      await diagnoseProductImageFailure(imageUrl, new AbortController().signal),
      DEFAULT_IMAGE_FAILURE,
    );
    t.mock.restoreAll();
  }
});

test("manual retry bypasses old API responses without modifying signed external URLs or inline images", () => {
  const retried = new URL(retryProductImageUrl(imageUrl, 1234));
  assert.equal(retried.searchParams.get("imageRetry"), "1234");
  assert.equal(retryProductImageUrl(imageUrl, 0), imageUrl);
  for (const src of [
    "https://images.example/image.webp?signature=original",
    "data:image/png;base64,aGVsbG8=",
  ]) {
    assert.equal(retryProductImageUrl(src, 1234), src);
  }
});
