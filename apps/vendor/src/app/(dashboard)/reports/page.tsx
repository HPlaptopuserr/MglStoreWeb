"use client";

import { useState } from "react";
import { BarChart3, Boxes, FileText } from "lucide-react";
import { salesDay } from "@/features/pos/utils/sales-history-filters";
import { ProductReportTable } from "@/features/reports/ProductReportTable";
import { SalesReportEntry } from "@/features/reports/SalesReportEntry";
import { useProductReportData } from "@/features/reports/useProductReportData";
import { ProductInventoryReport } from "@/features/reports/ProductInventoryReport";

export default function ReportsPage() {
  const data = useProductReportData();
  const [section, setSection] = useState<"inventory" | "sales">("inventory");
  const [salesOpened, setSalesOpened] = useState(false);
  const [demo, setDemo] = useState(false);
  const [today] = useState(() => salesDay(new Date().toISOString()));
  const [salesRange, setSalesRange] = useState(() => ({
    start: salesDay(new Date(Date.now() - 29 * 86400000).toISOString()),
    end: salesDay(new Date().toISOString()),
  }));
  return (
    <div className="space-y-5 pb-10">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2 text-indigo-600">
          <FileText size={18} />
          <p className="text-xs font-bold tracking-wide">
            Бүтээгдэхүүний шинжилгээ
          </p>
        </div>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Тайлан
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Одоогийн нөөц, үнийн шинжилгээ болон хугацааны борлуулалтаа тусад нь
          шалгаж, сонгосон тайлангаа татна.
        </p>
      </header>
      <div
        role="group"
        aria-label="Тайлангийн хэсэг"
        className="grid gap-2 sm:grid-cols-2"
      >
        {[
          {
            value: "inventory",
            label: "Бүтээгдэхүүн ба нөөц",
            hint: "Одоогийн үлдэгдэл, үнэ, боломжит ашиг",
            icon: Boxes,
          },
          {
            value: "sales",
            label: "Борлуулалтын тайлан",
            hint: "Салбар, огноо, ажилтнаар зарагдсан бараа",
            icon: BarChart3,
          },
        ].map(({ value, label, hint, icon: Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={section === value}
            onClick={() => {
              setSection(value === "inventory" ? "inventory" : "sales");
              if (value === "sales") setSalesOpened(true);
            }}
            className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition focus-visible:outline-indigo-600 ${section === value ? "border-indigo-300 bg-indigo-50 shadow-sm" : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"}`}
          >
            <Icon
              size={22}
              className={
                section === value ? "text-indigo-600" : "text-slate-400"
              }
            />
            <span>
              <span className="block text-sm font-bold text-slate-900">
                {label}
              </span>
              <span className="mt-1 block text-xs text-slate-500">{hint}</span>
            </span>
          </button>
        ))}
      </div>
      {process.env.NODE_ENV !== "production" && (
        <label className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
          <input
            type="checkbox"
            checked={demo}
            onChange={(event) => {
              setDemo(event.target.checked);
            }}
          />
          Тест өгөгдөл · Бодит бүртгэлд хадгалахгүй
        </label>
      )}
      <div hidden={section !== "inventory"}>
        <ProductInventoryReport
          key={String(demo)}
          data={data}
          demo={demo}
          today={today}
        />
      </div>
      <div hidden={section !== "sales"}>
        {salesOpened && (
          <SalesReportEntry
            organizationId={data.organizationId}
            demo={demo}
            onDemoChange={setDemo}
            range={salesRange}
            onRangeChange={setSalesRange}
          />
        )}
      </div>
    </div>
  );
}
