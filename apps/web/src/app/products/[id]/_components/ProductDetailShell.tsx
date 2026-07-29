"use client";

import Link from "next/link";
import type React from "react";
import { useState } from "react";
import {
  Check,
  ChevronRight,
  Heart,
  Minus,
  PackageCheck,
  Plus,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ProductCard } from "@mgl/ui";
import { resolveMemberPricing } from "@/lib/member-pricing";
import { organizationPath } from "@/lib/organization-links";

export interface ProductImage {
  id: string;
  url: string;
}
export interface Organization {
  id: string;
  name: string;
  slug?: string | null;
  logoUrl?: string | null;
}
export interface BusinessCategory {
  id: string;
  name: string;
  slug: string;
}
export interface Discount {
  percent: number;
  validUntil: string;
}

export interface ProductDetailProduct {
  id: string;
  name: string;
  description?: string | null;
  specifications?: ProductSpecification[] | null;
  sku?: string | null;
  price: number;
  stock?: number | null;
  supplyType?: "IN_STOCK" | "CHINA_PREORDER";
  preorderLeadTimeDays?: number | null;
  preorderNote?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  soldCount?: number | null;
  images: ProductImage[];
  businessCategory?: BusinessCategory | null;
  organization: Organization;
  discounts: Discount[];
}

export interface ProductSpecification {
  label: string;
  value: string;
}

type Countdown = { d: number; h: number; m: number; s: number };

type ProductDetailShellProps = {
  product: ProductDetailProduct;
  activeImg: number;
  setActiveImg: (index: number) => void;
  discountedPrice: number;
  originalPrice: number | null;
  savings: number;
  countdown: Countdown;
  wishlisted: boolean;
  shareCopied: boolean;
  isPreorder: boolean;
  isOutOfStock: boolean;
  onAddToCart: (quantity: number) => void;
  onToggleWishlist: () => void;
  onShare: () => void;
  vendorProducts: ProductDetailProduct[];
  relatedProducts: ProductDetailProduct[];
  isMember: boolean;
};

const FAQ_ITEMS = [
  "Захиалгын явцыг хэрхэн харах вэ?",
  "Буцаалт болон солилцоо",
  "Төлбөрийн нөхцөл",
];

function formatPrice(value: number) {
  if (value <= 0) return "Үнэ тохиролцоно";
  return `${value.toLocaleString("en-US")}₮`;
}

function recommendationGrid(items: ProductDetailProduct[], isMember: boolean) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const pricing = resolveMemberPricing(
          item.price,
          item.discounts,
          isMember,
        );

        return (
          <ProductCard
            key={item.id}
            href={`/products/${item.id}`}
            image={item.images?.[0]?.url}
            price={pricing.price}
            originalPrice={pricing.originalPrice ?? undefined}
            memberDiscountLabel={pricing.label}
            name={item.name}
            category={item.businessCategory?.name}
            storeName={item.organization?.name}
            stock={item.stock ?? undefined}
            isPreorder={item.supplyType === "CHINA_PREORDER"}
            preorderLeadTimeDays={item.preorderLeadTimeDays}
          />
        );
      })}
    </div>
  );
}

export function ProductDetailShell({
  product,
  activeImg,
  setActiveImg,
  discountedPrice,
  originalPrice,
  savings,
  countdown,
  wishlisted,
  shareCopied,
  isPreorder,
  isOutOfStock,
  onAddToCart,
  onToggleWishlist,
  onShare,
  vendorProducts,
  relatedProducts,
  isMember,
}: ProductDetailShellProps) {
  const images = product.images ?? [];
  const discount = product.discounts?.[0];
  const [informationTab, setInformationTab] = useState<
    "description" | "specifications" | "delivery"
  >("description");
  const specifications = Array.isArray(product.specifications)
    ? product.specifications.filter((item): item is ProductSpecification =>
        Boolean(item?.label?.trim() && item?.value?.trim()),
      )
    : [];

  return (
    <div className="min-h-screen bg-white pb-24 lg:pb-10">
      <div className="border-b border-slate-100 bg-white">
        <div className="container mx-auto px-4 py-3 lg:px-8">
          <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <Link href="/" className="transition hover:text-slate-950">
              Нүүр
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/products" className="transition hover:text-slate-950">
              Бүтээгдэхүүн
            </Link>
            {product.businessCategory && (
              <>
                <ChevronRight className="h-3.5 w-3.5" />
                <Link
                  href={`/products?category=${product.businessCategory.slug}`}
                  className="transition hover:text-slate-950"
                >
                  {product.businessCategory.name}
                </Link>
              </>
            )}
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="line-clamp-1 max-w-[240px] text-slate-600">
              {product.name}
            </span>
          </nav>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1500px] px-4 py-5 lg:px-8">
        <section className="grid gap-5 bg-white lg:h-[min(760px,calc(100svh-11rem))] lg:grid-cols-[72px_minmax(0,680px)_minmax(420px,1fr)] lg:items-stretch lg:gap-7">
          <div className="hidden gap-3 overflow-y-auto py-1 lg:flex lg:h-full lg:min-h-0 lg:flex-col">
            {images.slice(0, 7).map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveImg(index)}
                className={`h-16 overflow-hidden rounded-xl bg-slate-50 transition ${
                  index === activeImg
                    ? "ring-2 ring-orange-500 ring-offset-2"
                    : "border border-slate-200 opacity-70 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>

          <ProductImageStage
            productName={product.name}
            images={images}
            activeImg={activeImg}
            setActiveImg={setActiveImg}
            discountPercent={discount?.percent}
            discountLabel={
              discount ? `Member -${discount.percent}%` : undefined
            }
          />

          <ProductCommercePanel
            product={product}
            discountedPrice={discountedPrice}
            originalPrice={originalPrice}
            savings={savings}
            countdown={countdown}
            wishlisted={wishlisted}
            shareCopied={shareCopied}
            isMember={isMember}
            isPreorder={isPreorder}
            isOutOfStock={isOutOfStock}
            onAddToCart={onAddToCart}
            onToggleWishlist={onToggleWishlist}
            onShare={onShare}
          />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div
              role="tablist"
              aria-label="Бүтээгдэхүүний мэдээлэл"
              className="flex gap-6 border-b border-slate-100 text-sm font-black text-slate-400"
            >
              {(
                [
                  ["description", "Дэлгэрэнгүй"],
                  ["specifications", "Үзүүлэлт"],
                  ["delivery", "Хүргэлт"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={informationTab === value}
                  onClick={() => setInformationTab(value)}
                  className={`border-b-2 pb-3 transition ${
                    informationTab === value
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {informationTab === "description" && (
              <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Бүтээгдэхүүний тайлбар
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-600">
                    {product.description ||
                      "Энэ бүтээгдэхүүний дэлгэрэнгүй тайлбар одоогоор ороогүй байна."}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Товч мэдээлэл
                  </p>
                  <dl className="mt-3 grid gap-3 text-sm">
                    <SpecRow
                      label="SKU"
                      value={product.sku || "Бүртгэгдээгүй"}
                    />
                    <SpecRow
                      label="Ангилал"
                      value={product.businessCategory?.name || "Бусад"}
                    />
                    <SpecRow
                      label="Дэлгүүр"
                      value={product.organization.name}
                    />
                    <SpecRow
                      label="Нийлүүлэлт"
                      value={isPreorder ? "Захиалгаар" : "Бэлэн бараа"}
                    />
                  </dl>
                </div>
              </div>
            )}

            {informationTab === "specifications" && (
              <div className="mt-5">
                {specifications.length > 0 ? (
                  <dl className="grid overflow-hidden rounded-2xl border border-slate-100 sm:grid-cols-2">
                    {specifications.map((item, index) => (
                      <div
                        key={`${item.label}-${index}`}
                        className="grid grid-cols-[minmax(110px,0.7fr)_1.3fr] gap-3 border-b border-slate-100 bg-white px-4 py-3 text-sm last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 sm:odd:border-r"
                      >
                        <dt className="font-bold text-slate-400">
                          {item.label}
                        </dt>
                        <dd className="break-words font-bold text-slate-800">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <div className="rounded-2xl bg-slate-50 px-5 py-10 text-center text-sm font-semibold text-slate-400">
                    Бүтээгдэхүүний үзүүлэлт хараахан ороогүй байна.
                  </div>
                )}
              </div>
            )}

            {informationTab === "delivery" && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <DeliveryInfo
                  icon={Truck}
                  title={isPreorder ? "Урьдчилсан захиалга" : "Хүргэлт"}
                  description={
                    isPreorder
                      ? product.preorderNote ||
                        `${product.preorderLeadTimeDays || 14} хоногт ирнэ`
                      : "Бэлэн барааг хүргэлтийн нөхцөлийн дагуу илгээнэ."
                  }
                />
                <DeliveryInfo
                  icon={ShieldCheck}
                  title="Баталгаатай дэлгүүр"
                  description={`${product.organization.name} дэлгүүрээс шууд нийлүүлэгдэнэ.`}
                />
              </div>
            )}
          </div>

          <aside className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Түгээмэл асуултууд
            </p>
            <div className="mt-3 divide-y divide-slate-100">
              {FAQ_ITEMS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-bold text-slate-600 transition hover:text-orange-600"
                >
                  {item}
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                </button>
              ))}
            </div>
          </aside>
        </section>

        {relatedProducts.length > 0 && (
          <ProductShelf
            title="Төстэй бараа"
            label="Recommended for you"
            href={
              product.businessCategory
                ? `/products?category=${product.businessCategory.slug}`
                : "/products"
            }
          >
            {recommendationGrid(relatedProducts, isMember)}
          </ProductShelf>
        )}

        {vendorProducts.length > 0 && (
          <ProductShelf
            title="Энэ дэлгүүрийн бусад бараа"
            label="Vendor products"
            href={organizationPath(product.organization)}
          >
            {recommendationGrid(vendorProducts, isMember)}
          </ProductShelf>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-400">
              {product.name}
            </p>
            <p className="text-lg font-black text-orange-600">
              {formatPrice(discountedPrice)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onAddToCart(1)}
            disabled={isOutOfStock}
            className="flex h-12 min-w-[150px] items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-400"
          >
            <ShoppingCart className="h-4 w-4" />
            {isOutOfStock ? "Дууссан" : isPreorder ? "Захиалах" : "Сагслах"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductImageStage({
  productName,
  images,
  activeImg,
  setActiveImg,
  discountPercent,
  discountLabel,
}: {
  productName: string;
  images: ProductImage[];
  activeImg: number;
  setActiveImg: (index: number) => void;
  discountPercent?: number;
  discountLabel?: string;
}) {
  return (
    <div className="min-w-0 lg:h-full lg:min-h-0">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-50 lg:h-full lg:aspect-auto">
        {images.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={images[activeImg]?.url ?? images[0].url}
            alt={productName}
            className="h-full w-full object-contain p-2 sm:p-4"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_32%,#ffffff_0%,#f8fafc_38%,#eef2f7_100%)] p-8">
            <div className="text-center">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] bg-white text-slate-300 shadow-sm ring-1 ring-slate-100">
                <Store className="h-12 w-12" />
              </div>
              <p className="mx-auto mt-5 max-w-[18rem] text-lg font-black leading-snug text-slate-700">
                {productName}
              </p>
              <p className="mt-2 text-sm font-bold text-slate-400">
                Бүтээгдэхүүний зураг удахгүй нэмэгдэнэ
              </p>
            </div>
          </div>
        )}
        {discountPercent && (
          <span className="absolute left-4 top-4 rounded-2xl bg-emerald-600 px-3 py-1.5 text-sm font-black text-white shadow-lg shadow-emerald-500/20">
            {discountLabel || `-${discountPercent}%`}
          </span>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveImg(index)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-50 ${
                index === activeImg
                  ? "ring-2 ring-orange-500 ring-offset-2"
                  : "border border-slate-200"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCommercePanel({
  product,
  discountedPrice,
  originalPrice,
  savings,
  countdown,
  wishlisted,
  shareCopied,
  isMember,
  isPreorder,
  isOutOfStock,
  onAddToCart,
  onToggleWishlist,
  onShare,
}: Omit<
  ProductDetailShellProps,
  "activeImg" | "setActiveImg" | "vendorProducts" | "relatedProducts"
>) {
  const discount = product.discounts?.[0];
  const [quantity, setQuantity] = useState(1);
  const maxQuantity =
    isPreorder || typeof product.stock !== "number"
      ? 99
      : Math.max(1, product.stock);

  return (
    <div className="flex min-w-0 flex-col lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-1">
      <Link
        href={organizationPath(product.organization)}
        className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-3 transition hover:text-orange-600"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-100">
            {product.organization.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.organization.logoUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <Store className="h-5 w-5 text-slate-300" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-900">
              {product.organization.name}
            </p>
            <p className="mt-0.5 text-xs font-bold text-slate-400">
              Баталгаатай дэлгүүр
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700">
          Дэлгүүр орох
        </span>
      </Link>

      {discount && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 text-white">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-white/75">
              Онцлох хямдрал
            </p>
            <p className="mt-0.5 text-sm font-black">
              {isMember
                ? `Member -${discount.percent}% үнэ буурсан`
                : `Member бол -${discount.percent}% хөнгөлнө`}
            </p>
          </div>
          <div className="grid grid-cols-4 gap-1 text-center">
            {[
              { val: countdown.d, label: "өд" },
              { val: countdown.h, label: "ц" },
              { val: countdown.m, label: "м" },
              { val: countdown.s, label: "с" },
            ].map((item) => (
              <span
                key={item.label}
                className="rounded-xl bg-white/16 px-2 py-1"
              >
                <span className="block text-sm font-black tabular-nums">
                  {String(item.val).padStart(2, "0")}
                </span>
                <span className="block text-[9px] font-bold text-white/70">
                  {item.label}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <h1 className="text-2xl font-black leading-tight tracking-tight text-slate-950 xl:text-3xl">
        {product.name}
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
        <span className="text-amber-500">
          ★ {(product.rating ?? 0).toFixed(1)}/10
        </span>
        <span>{product.reviewCount ?? 0} үнэлгээ</span>
        <span>{product.soldCount ?? 0} зарагдсан</span>
        {product.businessCategory && (
          <span>{product.businessCategory.name}</span>
        )}
        {product.sku && <span>SKU: {product.sku}</span>}
        <span>{isPreorder ? "Захиалгаар" : "Бэлэн бараа"}</span>
      </div>

      <div className="mt-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 p-4 text-white">
        <div className="flex flex-wrap items-end gap-2">
          <span className="text-4xl font-black leading-none">
            {formatPrice(discountedPrice)}
          </span>
          {originalPrice && (
            <span className="pb-1 text-base font-bold text-white/65 line-through">
              {formatPrice(originalPrice)}
            </span>
          )}
        </div>
        {savings > 0 && (
          <p className="mt-2 text-sm font-bold text-white/80">
            Хэмнэлт: {formatPrice(savings)}
          </p>
        )}
      </div>

      <div className="mt-3 grid gap-2 text-sm font-bold text-slate-600">
        <Benefit
          icon={Truck}
          text={
            isPreorder
              ? `${product.preorderLeadTimeDays ?? 14} хоногт ирнэ`
              : "Бэлэн бараа, хурдан хүргэлт"
          }
        />
        <Benefit
          icon={ShieldCheck}
          text="Баталгаатай дэлгүүрээс шууд худалдан авалт"
        />
        <Benefit
          icon={PackageCheck}
          text={
            isOutOfStock
              ? "Нөөц дууссан"
              : `Үлдэгдэл: ${product.stock ?? "боломжтой"}`
          }
        />
      </div>

      {isPreorder && product.preorderNote && (
        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-sm font-semibold leading-6 text-blue-800">
          {product.preorderNote}
        </div>
      )}

      <div className="mt-auto pt-3">
        <div className="mb-3 flex items-center justify-between border-y border-slate-100 py-3">
          <span className="text-xs font-black text-slate-500">Тоо ширхэг</span>
          <div className="flex items-center rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              disabled={quantity <= 1}
              className="flex h-10 w-10 items-center justify-center text-slate-500 disabled:text-slate-200"
              aria-label="Тоо ширхэг хасах"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center text-sm font-black">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                setQuantity((value) => Math.min(maxQuantity, value + 1))
              }
              disabled={quantity >= maxQuantity}
              className="flex h-10 w-10 items-center justify-center text-slate-500 disabled:text-slate-200"
              aria-label="Тоо ширхэг нэмэх"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_0.52fr]">
          <button
            type="button"
            onClick={() => onAddToCart(quantity)}
            disabled={isOutOfStock}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-orange-500 text-base font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-slate-950 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            <ShoppingCart className="h-5 w-5" />
            {isOutOfStock
              ? "Нөөц дууссан"
              : isPreorder
                ? "Захиалах"
                : "Сагслах"}
          </button>
          <button
            type="button"
            onClick={onToggleWishlist}
            className={`flex h-14 items-center justify-center gap-2 rounded-2xl border text-sm font-black transition ${
              wishlisted
                ? "border-red-200 bg-red-50 text-red-500"
                : "border-slate-200 text-slate-600 hover:border-orange-200 hover:text-orange-600"
            }`}
          >
            <Heart className={`h-5 w-5 ${wishlisted ? "fill-red-500" : ""}`} />
            {wishlisted ? "Хадгалсан" : "Хадгалах"}
          </button>
        </div>
        <button
          type="button"
          onClick={onShare}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 text-sm font-black text-slate-500 transition hover:border-orange-200 hover:text-orange-600"
        >
          {shareCopied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Share2 className="h-4 w-4" />
          )}
          {shareCopied ? "Холбоос хуулсан" : "Хуваалцах"}
        </button>
      </div>
    </div>
  );
}

function Benefit({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-orange-500" />
      <span>{text}</span>
    </div>
  );
}

function DeliveryInfo({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-orange-500 shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-sm font-black text-slate-900">{title}</h3>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-none last:pb-0">
      <dt className="font-bold text-slate-400">{label}</dt>
      <dd className="text-right font-black text-slate-700">{value}</dd>
    </div>
  );
}

function ProductShelf({
  title,
  label,
  href,
  children,
}: {
  title: string;
  label: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
        </div>
        <Link
          href={href}
          className="text-sm font-black text-orange-600 hover:text-orange-700"
        >
          Бүгдийг харах
        </Link>
      </div>
      {children}
    </section>
  );
}
