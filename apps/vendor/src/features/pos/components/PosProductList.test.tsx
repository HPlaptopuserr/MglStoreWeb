import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { PosProduct, CartLine } from "@mgl/types";
import { PosProductList } from "./PosProductList";

const products: PosProduct[] = Array.from({ length: 5000 }, (_, index) => ({
  id: `product-${index}`,
  sku: `SKU-${index}`,
  name: `Product ${index}`,
  price: 1000,
  stockQty: index === 0 ? 0 : 10,
  isActive: true,
}));

test("a large catalog renders only 50 rows while retaining its full count", () => {
  const html = renderToStaticMarkup(
    <PosProductList
      products={products}
      cartLines={[]}
      onAdd={() => undefined}
    />,
  );
  assert.equal((html.match(/<li>/g) ?? []).length, 50);
  assert.match(html, /5000 бараа/);
  assert.match(html, /1 \/ 100/);
  assert.doesNotMatch(html, /Product 50,/);
  assert.match(html, /Дууссан/);
});

test("cart stock limits remain visible after row isolation", () => {
  const line: CartLine = {
    productId: products[1].id,
    name: products[1].name,
    qty: 10,
    stockQty: 10,
    unitPrice: 1000,
    priceType: "UNIT",
    baseUnitPrice: 1000,
    taxRate: 0,
    discountAmount: 0,
  };
  const html = renderToStaticMarkup(
    <PosProductList
      products={[products[1]]}
      cartLines={[line]}
      onAdd={() => undefined}
    />,
  );
  assert.match(html, /disabled=""/);
  assert.match(html, /Нөөц хүрсэн/);
  assert.match(html, /Сагсанд/);
});
