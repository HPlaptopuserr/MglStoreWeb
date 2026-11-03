"use client";
import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { BusinessCategory } from "@/types/category";

export interface CatalogFilters {
  productStatus: string;
  stock: string;
  supplyType: string;
  businessCategoryId: string;
}
export function ManagedCatalogFilters({
  filters,
  onChange,
  onReset,
  hasFilters,
}: {
  filters: CatalogFilters;
  onChange: (key: keyof CatalogFilters, value: string) => void;
  onReset: () => void;
  hasFilters: boolean;
}) {
  const { authFetch } = useAuth();
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await authFetch(`${API}/business-categories`, {
          signal: controller.signal,
        });
        const data: unknown = await response.json();
        if (!response.ok || !Array.isArray(data)) throw new Error();
        if (!controller.signal.aborted) {
          setCategories(data as BusinessCategory[]);
          setState("ready");
        }
      } catch {
        if (!controller.signal.aborted) setState("error");
      }
    }
    void load();
    return () => controller.abort();
  }, [authFetch, retry]);
  const fields: Array<{
    key: keyof CatalogFilters;
    label: string;
    options: Array<[string, string]>;
  }> = [
    {
      key: "productStatus",
      label: "Идэвхийн төлөв",
      options: [
        ["", "Бүх төлөв"],
        ["active", "Идэвхтэй"],
        ["inactive", "Идэвхгүй"],
      ],
    },
    {
      key: "stock",
      label: "Нөөц",
      options: [
        ["", "Бүх нөөц"],
        ["in_stock", "Захиалах боломжтой"],
        ["low_stock", "Нөөц багатай"],
        ["sold_out", "Нөөц дууссан"],
      ],
    },
    {
      key: "supplyType",
      label: "Нийлүүлэлт",
      options: [
        ["", "Бүх төрөл"],
        ["stock", "Бэлэн бараа"],
        ["preorder", "Захиалгын бараа"],
      ],
    },
    {
      key: "businessCategoryId",
      label: "Ангилал",
      options: [
        [
          "",
          state === "loading"
            ? "Ангилал ачаалж байна…"
            : state === "error"
              ? "Ангилал ачаалсангүй"
              : "Бүх ангилал",
        ],
        ...categories.map((category): [string, string] => {
          const parent = categories.find(
            (candidate) => candidate.id === category.parentId,
          );
          return [
            category.id,
            parent ? `${parent.name} / ${category.name}` : category.name,
          ];
        }),
      ],
    },
  ];
  return (
    <div className="mb-5 space-y-2">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {fields.map((field) => (
          <label key={field.key} className="text-xs font-bold text-slate-500">
            {field.label}
            <select
              disabled={field.key === "businessCategoryId" && state !== "ready"}
              value={filters[field.key]}
              onChange={(event) => onChange(field.key, event.target.value)}
              className="mt-1.5 min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus-visible:ring-4 focus-visible:ring-orange-100 disabled:bg-slate-50"
            >
              {field.options.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {hasFilters && (
          <button
            type="button"
            onClick={onReset}
            className="min-h-10 text-sm font-bold text-orange-700 underline underline-offset-4"
          >
            Бүх шүүлтүүр цэвэрлэх
          </button>
        )}
        {state === "error" && (
          <button
            type="button"
            onClick={() => {
              setState("loading");
              setRetry((value) => value + 1);
            }}
            className="min-h-10 text-sm text-rose-700 underline"
          >
            Ангилал дахин ачаалах
          </button>
        )}
      </div>
    </div>
  );
}
