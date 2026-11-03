import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductSkuField } from "./ProductSkuField";

test("editing preserves stored and custom SKUs even with an empty filtered catalog", () => {
  for (const value of ["LYS-MGL-004", "custom-code-2026-A", ""]) {
    const changes: string[] = [];
    const html = renderToStaticMarkup(
      <ProductSkuField
        editing
        productName="Аляска шоколад"
        products={[]}
        value={value}
        onChange={(sku) => changes.push(sku)}
      />,
    );
    assert.ok(html.includes(`value="${value}"`));
    assert.match(html, /aria-describedby=/);
    assert.doesNotMatch(html, /SKU код үүсгэгч/);
    assert.deepEqual(changes, []);
  }
});

test("new products retain the SKU generator", () => {
  const html = renderToStaticMarkup(
    <ProductSkuField
      editing={false}
      productName="Шинэ бараа"
      products={[]}
      value=""
      onChange={() => undefined}
    />,
  );
  assert.match(html, /SKU код үүсгэгч/);
});
