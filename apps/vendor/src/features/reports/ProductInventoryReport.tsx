"use client";
import { useMemo, useState } from "react";
import { ProductReportTable } from "./ProductReportTable";
import { ProductReportFilters } from "./ProductReportFilters";
import { InventoryReportActions } from "./InventoryReportActions";
import { ProductReportSummary } from "./ProductReportSummary";
import { createReportDemo } from "./report-demo";
import { calculateProductReportTotals } from "./product-report";
import {
  describeProductReportFilters,
  emptyProductReportFilters,
  filterReportProducts,
} from "./product-report-filters";
import type { useProductReportData } from "./useProductReportData";

export function ProductInventoryReport({
  data,
  demo,
  today,
}: {
  data: ReturnType<typeof useProductReportData>;
  demo: boolean;
  today: string;
}) {
  const [filters, setFilters] = useState({ ...emptyProductReportFilters });
  const demoData = useMemo(() => createReportDemo(today), [today]);
  const products = demo ? demoData.products : data.products;
  const filtered = useMemo(
    () => filterReportProducts(products, filters),
    [products, filters],
  );
  const totals = useMemo(
    () => calculateProductReportTotals(filtered),
    [filtered],
  );
  const categories = useMemo(
    () =>
      [
        ...new Set(
          products
            .map((product) => product.businessCategory?.name)
            .filter((name): name is string => Boolean(name)),
        ),
      ].sort((a, b) => a.localeCompare(b, "mn")),
    [products],
  );
  const description = describeProductReportFilters(filters);
  const loading = !demo && data.loading;
  const organizationName = demo
    ? "TEST — Туршилтын байгууллага"
    : data.organizationName;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Бүтээгдэхүүн ба нөөц
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Нийт байгууллагын одоогийн бүртгэл. Борлуулалтын огноо энэ хэсэгт
            үйлчлэхгүй.
          </p>
        </div>
        <InventoryReportActions
          options={{
            organizationName,
            products: filtered,
            filterDescription: description,
            bestSellingProducts: [],
            salesPeriodDescription: "",
          }}
          loading={loading || Boolean(data.error && !demo)}
          onRefresh={data.refresh}
        />
      </div>
      <ProductReportFilters
        filters={filters}
        categories={categories}
        count={filtered.length}
        onChange={setFilters}
      />
      {data.error && !demo ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          {data.error}
          <button
            type="button"
            onClick={data.refresh}
            className="ml-3 font-semibold underline"
          >
            Дахин оролдох
          </button>
        </div>
      ) : loading ? (
        <div
          role="status"
          className="grid animate-pulse gap-3 sm:grid-cols-4"
          aria-label="Нөөцийн тайлан ачаалж байна"
        >
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-36 rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <ProductReportSummary totals={totals} />
      )}
      {!data.error || demo ? (
        <ProductReportTable
          key={JSON.stringify([filters, demo])}
          products={filtered}
          organizationName={organizationName}
          filterDescription={description}
          loading={loading}
        />
      ) : null}
      <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
        Боломжит ашиг нь бодит борлуулалтын ашиг биш. Өртөг бүртгэлтэй барааны
        одоогийн үлдэгдлийг зарах үнээр борлуулбал гарах тооцоо. Өртөггүй болон
        сөрөг үлдэгдэлтэй барааг ашгийн тооцоонд оруулахгүй.
      </p>
    </div>
  );
}
