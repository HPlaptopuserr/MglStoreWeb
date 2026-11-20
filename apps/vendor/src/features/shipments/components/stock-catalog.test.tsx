import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WarehouseProductCard } from "./WarehouseProductCard";
import { StockRequestWorkflowNav } from "./StockRequestWorkflowNav";
import { commitStockRequestQuantity } from "./StockRequestQuantityInput";
import { StockRequestCheckout } from "./StockRequestCheckout";
import { StockOrderSuccessDialog } from "./StockOrderSuccessDialog";
import { WarehouseProductCatalog } from "./WarehouseProductCatalog";
import type { WarehouseInventoryItem } from "../types/stock-request.types";
import type { ComponentProps } from "react";

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

function renderCatalog(
  overrides: Partial<ComponentProps<typeof WarehouseProductCatalog>> = {},
) {
  return renderToStaticMarkup(
    <WarehouseProductCatalog
      productSort="topSelling"
      setProductSort={noop}
      navigation={null}
      outstandingPayments={null}
      retryProducts={noop}
      loadMoreProducts={noop}
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
      productSearch=""
      setProductSearch={noop}
      categories={[
        { id: "business:food", name: "Хүнс", parentId: null, productCount: 60 },
        {
          id: "business:dairy",
          name: "Сүү, цагаан идээ",
          parentId: "business:food",
          productCount: 12,
        },
        {
          id: "business:milk",
          name: "Сүү",
          parentId: "business:dairy",
          productCount: 4,
        },
        {
          id: "business:home",
          name: "Гэр ахуй",
          parentId: null,
          productCount: 30,
        },
      ]}
      setSelectedCategory={noop}
      selectedCategory={null}
      productsLoading={false}
      productsError={null}
      user={null}
      addRecommendationToCart={noop}
      warehouseProducts={[item]}
      renderProductCard={(product) => (
        <div key={product.id}>{product.product.name}</div>
      )}
      productsTotal={90}
      productsLoadMoreRef={{ current: null }}
      productsLoadingMore={false}
      productsHasMore={true}
      cart={[]}
      {...overrides}
    />,
  );
}

test("shoppers can browse main and nested food categories without knowing a product name", () => {
  const all = renderCatalog();
  assert.match(all, /aria-label="Барааны ангилал"/);
  assert.match(all, /Хүнс/);
  assert.match(all, /Гэр ахуй/);
  assert.doesNotMatch(all, /Сүү, цагаан идээ/);
  const food = renderCatalog({ selectedCategory: "business:food" });
  assert.match(food, /aria-label="Дэд ангилал"/);
  assert.match(food, /Сүү, цагаан идээ/);
  const dairy = renderCatalog({ selectedCategory: "business:dairy" });
  assert.match(dairy, /aria-label="Сонгосон ангиллын зам"/);
  assert.match(dairy, /aria-current="page"/);
  assert.match(dairy, />Сүү /);
  assert.match(dairy, /Гэр ахуй/);
  assert.match(dairy, /Дараагийн барааг үзэх/);
});

test("empty search results keep category navigation and offer clearing the filters", () => {
  const html = renderCatalog({
    productSearch: "олдохгүй",
    warehouseProducts: [],
    productsTotal: 0,
    productsHasMore: false,
  });
  assert.match(html, /Бараа олдсонгүй/);
  assert.match(html, /Шүүлтүүр цэвэрлэх/);
  assert.match(html, /Хүнс/);
  assert.match(html, /Гэр ахуй/);
  assert.match(html, /aria-label="Хайлт цэвэрлэх"/);
  assert.match(html, /Сонгосон агуулахын бүх ангиллаас хайж байна/);
});

test("recommendations are collapsed so shoppers reach the product grid immediately", () => {
  const html = renderCatalog({ user: { id: "user", organizationId: "org" } });
  assert.match(html, /<details[^>]*><summary[^>]*>Танд санал болгох бараа/);
  assert.doesNotMatch(html, /<details[^>]*\bopen/);
  assert.match(html, /Туршилтын бараа/);
});

test("catalog defaults to best sellers and offers alphabetical ordering", () => {
  const html = renderCatalog();
  assert.match(
    html,
    /<option value="topSelling" selected="">Их борлуулалттай эхэнд/,
  );
  assert.match(html, /Сүүлийн 90 хоногийн сүлжээний дууссан борлуулалтаар/);
  const alphabetical = renderCatalog({ productSort: "name" });
  assert.match(alphabetical, /<option value="name" selected="">Нэрээр/);
  assert.match(alphabetical, /Барааны нэрийн дарааллаар/);
});

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
      productSort="topSelling"
      setProductSort={noop}
      navigation={nav}
      outstandingPayments={{ count: 1, totalUnpaid: 12500, payments: [] }}
      retryProducts={noop}
      loadMoreProducts={noop}
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
  assert.match(html, /Бүх барааг үзэх/);
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

const cartLine = {
  productId: item.product.id,
  quantity: 2,
  name: item.product.name,
  sku: item.product.sku,
  price: item.product.price,
  available: item.quantity,
  image: null,
};

function renderCheckout(
  overrides: Partial<ComponentProps<typeof StockRequestCheckout>> = {},
) {
  return renderToStaticMarkup(
    <StockRequestCheckout
      setViewMode={noop}
      selectedWarehouse={{
        id: "w",
        name: "Төв агуулах",
        city: "УБ",
        district: "",
        address: "",
        phone: null,
      }}
      totalCartItems={2}
      cart={[cartLine]}
      updateCartQuantity={noop}
      totalCartAmount={25000}
      user={null}
      deliveryAddress="БЗД 26-р хороо, ХОТХОН 217-р байр, 302 тоот"
      deliveryPhone="99112233"
      setDeliveryAddress={noop}
      setDeliveryPhone={noop}
      note=""
      setNote={noop}
      setShowConfirmModal={noop}
      isSubmitting={false}
      confirmationDialog={null}
      successDialog={null}
      {...overrides}
    />,
  );
}

test("saved carts explain device persistence without hiding the checkout action", () => {
  const html = renderCatalog({ cart: [cartLine], totalCartItems: 2 });
  assert.match(html, /Сагс энэ төхөөрөмж дээр хадгалагдана/);
  assert.match(html, /aria-label="Сагс харах, 2 ширхэг бараа"/);
});

test("checkout has labeled quantity and removal controls and a complete delivery summary", () => {
  const html = renderCheckout();
  assert.match(html, /aria-label="Туршилтын бараа-ийн тоо хэмжээ"/);
  assert.match(html, /aria-label="Туршилтын бараа-ийг сагснаас хасах"/);
  assert.match(html, /БЗД 26-р хороо, ХОТХОН 217-р байр, 302 тоот/);
  assert.match(html, /99112233/);
  assert.match(html, /<aside[^>]*aria-labelledby="checkout-summary-title"/);
  assert.match(html, /Захиалга баталгаажуулах/);
  assert.doesNotMatch(
    html,
    /<button[^>]*disabled=""[^>]*>Захиалга баталгаажуулах/,
  );
});

test("checkout prevents proceeding without an address and keeps storage failures visible", () => {
  const html = renderCheckout({
    deliveryAddress: "",
    storageError: "Сагс хадгалагдсангүй",
  });
  assert.match(html, /role="alert"[^>]*>Сагс хадгалагдсангүй/);
  assert.match(html, /Хүргэлтийн хаягаа сонгоно уу/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>Захиалга баталгаажуулах/);
});

test("successful submission dialog remains visible after the persisted cart is cleared", () => {
  const html = renderCheckout({
    cart: [],
    totalCartItems: 0,
    successDialog: (
      <StockOrderSuccessDialog
        showOrderSuccessModal
        totalCartItems={2}
        finishSuccessfulOrder={noop}
      />
    ),
  });
  assert.match(html, /Захиалга амжилттай илгээгдлээ/);
  assert.match(html, /2 ширхэг/);
});

test("quantity editing preserves the cart on blank, zero and invalid whole-number input", () => {
  for (const text of [
    "",
    "   ",
    "0",
    "-1",
    "1.5",
    "1e2",
    "NaN",
    "Infinity",
    "9007199254740992",
  ]) {
    assert.equal(commitStockRequestQuantity(text, 7, 50), 7, text);
  }
  assert.equal(commitStockRequestQuantity("3", 7, 0), 7);
});

test("quantity editing accepts a complete value and caps it at available stock", () => {
  assert.equal(commitStockRequestQuantity("25", 7, 50), 25);
  assert.equal(commitStockRequestQuantity(" 12 ", 7, 50), 12);
  assert.equal(commitStockRequestQuantity("99", 7, 50), 50);
  assert.equal(commitStockRequestQuantity("1", 7, 50), 1);
});
