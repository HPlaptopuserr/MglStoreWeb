import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, mock, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma, type Prisma } from "@mgl/database";
import router from "./products.routes";
import posRouter from "../operations/pos/catalog.routes";
import { invalidatePublicProductListCache } from "../../services/product-list-cache.service";

let server: Server;
let base: string;
const headers = {
  Authorization: `Bearer ${jwt.sign({ userId: "owner", organizationId: "store", role: "USER" }, process.env.JWT_SECRET || "dev-secret-change-me")}`,
};
const products = Array.from({ length: 494 }, (_, index) => ({
  id: `product-${String(index).padStart(4, "0")}`,
  name: index === 493 ? "Mgl Cafe Latte" : `Latte ${index}`,
  description: null,
  sku: `SKU-${index}`,
  barcode: null,
  classificationCode: "6331000",
  taxProductCode: null,
  marketplacePriority: 0,
  createdAt: new Date(2026, 0, 1),
  businessCategory: null,
  category: null,
  organization: { id: "store", name: "Mgl Store" },
  isActive: index !== 493,
  price: 5500,
  stock: 0,
  unit: "pcs",
  supplyType: "IN_STOCK",
  preorderCapacity: null,
  supplierDocument: null,
  images: [],
  discounts: [],
  warehouseInventories: [],
}));

const restores: (() => void)[] = [];
function stub(
  target: object,
  key: string,
  implementation: (...args: never[]) => unknown,
) {
  const previous: unknown = Reflect.get(target, key);
  const replacement = mock.fn((...args: unknown[]) =>
    Reflect.apply(implementation, target, args),
  );
  Reflect.set(target, key, replacement);
  restores.push(() => {
    Reflect.set(target, key, previous);
  });
  return replacement;
}

before(async () => {
  const app = express();
  app.use("/api", router, posRouter);
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});
after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});
afterEach(() => {
  while (restores.length) restores.pop()?.();
  mock.restoreAll();
});
beforeEach(() => {
  invalidatePublicProductListCache();
  stub(prisma.product, "count", async () => products.length);
  stub(prisma.product, "findMany", async (args: Prisma.ProductFindManyArgs) => {
    if (args.select) {
      assert.equal(
        args.take,
        undefined,
        "all search candidates must be ranked",
      );
      assert.equal(args.where?.organizationId, "store");
      return products;
    }
    const conditions = args.where?.AND;
    assert.ok(Array.isArray(conditions));
    const filter = conditions[1]?.id;
    assert.ok(filter && typeof filter === "object");
    assert.ok(Array.isArray(filter.in));
    const ids = new Set(filter.in);
    assert.equal(
      args.skip,
      undefined,
      "a search page must not be paginated twice",
    );
    assert.equal(args.take, undefined);
    assert.ok(ids.size <= 24, "only the requested page is hydrated");
    return products.filter((product) => ids.has(product.id));
  });
  stub(prisma.warehouseInventory, "findMany", async () => []);
  stub(prisma.productInterestScore, "findMany", async () => []);
  stub(prisma.orderItem, "findMany", async () => []);
});

interface ProductPage {
  products: { id: string; name: string; isActive: boolean }[];
  total: number;
  hasMore: boolean;
}
async function search(query: string, offset = 0): Promise<ProductPage> {
  const response = await fetch(
    `${base}/products?organizationId=store&search=${encodeURIComponent(query)}&meta=1&limit=24&offset=${offset}`,
    { headers },
  );
  assert.equal(response.status, 200);
  return response.json();
}

test("organization search reaches every match beyond 240 without duplicates or empty later pages", async () => {
  const ids: string[] = [];
  for (let offset = 0; offset < products.length; offset += 24) {
    const page = await search("latte", offset);
    assert.equal(page.total, products.length);
    assert.equal(page.products.length, Math.min(24, products.length - offset));
    assert.equal(page.hasMore, offset + page.products.length < products.length);
    ids.push(...page.products.map((product) => product.id));
  }
  assert.equal(new Set(ids).size, products.length);
});

test("an older exact name outside the first 240 candidates is returned first", async () => {
  const page = await search("  mgl   cafe latte  ");
  assert.equal(page.products[0]?.name, "Mgl Cafe Latte");
  assert.equal(page.products[0]?.isActive, false, "owners must still find inactive products");
});

function stubPosAccess() {
  stub(prisma.user, "findUnique", async () => ({
    id: "owner",
    role: "USER",
    isActive: true,
    deletedAt: null,
  }));
  stub(prisma.organizationMember, "findFirst", async () => ({
    id: "member",
    organizationId: "store",
    role: "OWNER",
    capabilities: [],
  }));
  stub(prisma.branch, "findUnique", async () => ({ organizationId: "store" }));
}

test("POS returns the full active in-stock catalog without a product count or positive-stock limit", async () => {
  stubPosAccess();
  stub(prisma.product, "findMany", async (args: Prisma.ProductFindManyArgs) => {
    assert.equal(args.take, undefined);
    assert.equal(args.skip, undefined);
    assert.equal(args.where?.stock, undefined);
    assert.equal(args.where?.organizationId, "store");
    assert.equal(args.where?.isActive, true);
    assert.equal(args.where?.supplyType, "IN_STOCK");
    return products.filter((product) => product.isActive);
  });
  const response = await fetch(`${base}/pos/products?branchId=branch`, {
    headers,
  });
  assert.equal(response.status, 200);
  const rows: { id: string }[] = await response.json();
  assert.equal(rows.length, products.length - 1);
  assert.ok(rows.some((product) => product.id === "product-0304"));
  assert.ok(!rows.some((product) => product.id === "product-0493"));
});

test("catalog validation sends no duplicate payload, detects stock changes, and always checks access", async () => {
  stubPosAccess();
  let stock = 10;
  stub(prisma.product, "findMany", async (args: Prisma.ProductFindManyArgs) => {
    assert.equal(args.where?.organizationId, "store");
    assert.equal(args.take, undefined);
    return products.filter((product) => product.isActive).map((product) => ({ ...product, stock }));
  });
  const url = `${base}/pos/products?organizationId=store`;
  const initial = await fetch(url, { headers });
  assert.equal(initial.status, 200);
  assert.equal(initial.headers.get("X-MGL-Catalog-Count"), "493");
  assert.match(initial.headers.get("Cache-Control") || "", /private/);
  const etag = initial.headers.get("ETag");
  assert.ok(etag);
  await initial.arrayBuffer();
  const conditional = { ...headers, "If-None-Match": etag };
  const unchanged = await fetch(url, { headers: conditional });
  assert.equal(unchanged.status, 304);
  assert.equal(await unchanged.text(), "");

  stock = 9;
  const changed = await fetch(url, { headers: conditional });
  assert.equal(changed.status, 200);
  assert.notEqual(changed.headers.get("ETag"), etag);
  const rows: { stockQty: number }[] = await changed.json();
  assert.equal(rows[0]?.stockQty, 9);
  const unauthorized = await fetch(url, { headers: { "If-None-Match": etag } });
  assert.equal(unauthorized.status, 401);
  const mismatched = await fetch(`${base}/pos/products?branchId=branch&organizationId=other-store`, { headers: conditional });
  assert.equal(mismatched.status, 403);
});
