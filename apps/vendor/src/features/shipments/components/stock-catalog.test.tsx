import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WarehouseProductCard } from "./WarehouseProductCard";
import { StockRequestWorkflowNav } from "./StockRequestWorkflowNav";
import { StockOrderSuccessDialog } from "./StockOrderSuccessDialog";
import { WarehouseProductCatalog } from "./WarehouseProductCatalog";
import type { WarehouseInventoryItem } from "../types/stock-request.types";

const item: WarehouseInventoryItem = {
  id: "inventory",
  quantity: 10,
  minQuantity: 1,
  location: null,
  product: {
    id: "product",
    name: "Туршилтын бараа",
    sku: "SKU-1",
    price: "12500",
    images: [],
    category: null,
  },
};
const noop = () => undefined;

test("product cards label quantity controls and disable adding unavailable stock", () => {
  const html = renderToStaticMarkup(
    <WarehouseProductCard
      item={item}
      cartQty={2}
      onAdd={noop}
      onQuantityChange={noop}
    />,
  );
  assert.match(html, /Туршилтын бараа нэмэх/);
  assert.match(html, /Туршилтын бараа хасах/);
  assert.match(html, /Үлдэгдэл: 10 ш/);
  const empty = renderToStaticMarkup(
    <WarehouseProductCard
      item={{ ...item, quantity: 0 }}
      cartQty={0}
      onAdd={noop}
      onQuantityChange={noop}
    />,
  );
  assert.match(empty, /disabled=""/);
  assert.match(empty, /Үлдэгдэлгүй/);
});

test("outstanding invoices do not remove catalog navigation or its product grid", () => {
  const nav = (
    <StockRequestWorkflowNav
      active="new"
      pendingRequestCount={1}
      outstandingPaymentCount={1}
      onNavigate={noop}
    />
  );
  const html = renderToStaticMarkup(
    <WarehouseProductCatalog
      navigation={nav}
      outstandingPayments={{ count: 1, totalUnpaid: 12500, payments: [] }}
      retryProducts={noop}
      selectedWarehouse={{
        id: "w",
        name: "Төв агуулах",
        city: "УБ",
        district: "",
        address: "",
        phone: null,
      }}
      exitWarehouse={noop}
      setViewMode={noop}
      totalCartItems={0}
      productSearch="бараа"
      setProductSearch={noop}
      categories={[]}
      setSelectedCategory={noop}
      selectedCategory={null}
      productsLoading={false}
      productsError={null}
      user={null}
      addRecommendationToCart={noop}
      warehouseProducts={[item]}
      renderProductCard={(product) => (
        <WarehouseProductCard
          key={product.id}
          item={product}
          cartQty={0}
          onAdd={noop}
          onQuantityChange={noop}
        />
      )}
      productsTotal={1}
      productsLoadMoreRef={{ current: null }}
      productsLoadingMore={false}
      productsHasMore={false}
      cart={[]}
    />,
  );
  assert.match(html, /Агуулахын бараа/);
  assert.match(html, /Туршилтын бараа/);
  assert.match(html, /Төлбөрийн үлдэгдэл/);
  assert.match(html, /Төлбөр харах/);
});

test("order confirmation offers returning to products as well as order history", () => {
  const html = renderToStaticMarkup(
    <StockOrderSuccessDialog
      showOrderSuccessModal
      totalCartItems={2}
      finishSuccessfulOrder={noop}
    />,
  );
  assert.match(html, /Агуулахын бараа үргэлжлүүлэн үзэх/);
  assert.match(html, /Захиалгын түүх харах/);
});
