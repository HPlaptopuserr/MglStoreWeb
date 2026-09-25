import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeInlineProductImage,
  resolveProductImageRemoteUrl,
} from "./product-image-delivery";

test("decodeInlineProductImage decodes inline product images", () => {
  const image = decodeInlineProductImage("data:image/png;base64,aGVsbG8=");

  assert.equal(image?.contentType, "image/png");
  assert.equal(image?.body.toString("utf8"), "hello");
});

test("resolveProductImageRemoteUrl moves stale Supabase URLs", () => {
  const resolved = resolveProductImageRemoteUrl(
    "https://old-project.supabase.co/storage/v1/object/public/product-images/org/item.webp?x=1",
    "https://current-project.supabase.co",
  );

  assert.equal(
    resolved?.toString(),
    "https://current-project.supabase.co/storage/v1/object/public/product-images/org/item.webp?x=1",
  );
});

test("resolveProductImageRemoteUrl rejects arbitrary remote hosts", () => {
  assert.equal(
    resolveProductImageRemoteUrl(
      "https://example.com/image.jpg",
      "https://current-project.supabase.co",
    ),
    null,
  );
});
