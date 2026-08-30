"use client";

import { useMemo } from "react";
import {
  X,
  Banknote,
  BarChart2,
  Loader2,
  PackageSearch,
  Type,
  AlignLeft,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
} from "lucide-react";
import { BusinessCategory, FormState, Product } from "../types";
import { CategorySelector } from "./CategorySelector";
import { ImageUploadGrid } from "./ImageUploadGrid";
import { ProductDataAssistantPanel } from "./ProductDataAssistantPanel";
import { VendorSkuGenerator } from "./VendorSkuGenerator";
import { MasterCatalogSuggestions } from "./MasterCatalogSuggestions";
import { PreorderCurrencyPriceInput } from "./PreorderCurrencyPriceInput";
import {
  EBARIMT_TAX_PRODUCT_CODES,
  type EbarimtTaxProductCode,
} from "../data/ebarimt-tax-product-codes";
import { getCategoryTaxSearchText } from "../data/ebarimt-category-tax-defaults";

interface Props {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  editingId: string | null;
  saving: boolean;
  categories: BusinessCategory[];
  products?: Product[];
  onSwitchToEdit?: (p: Product) => void;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
}

const TAX_TYPE_OPTIONS = [
  { value: "VAT_ABLE", label: "VAT_ABLE - НӨАТ-тэй" },
  { value: "VAT_FREE", label: "VAT_FREE - НӨАТ-аас чөлөөлөгдсөн" },
  { value: "VAT_ZERO", label: "VAT_ZERO - НӨАТ 0%" },
  { value: "NOT_VAT", label: "NOT_VAT - НӨАТ ногдохгүй" },
] as const;

const TAX_PRODUCT_CODE_REQUIRED_TYPES = new Set([
  "VAT_FREE",
  "VAT_ZERO",
  "NOT_VAT",
]);

const TAX_CODE_SYNONYMS: Record<string, string[]> = {
  beef: ["үхрийн", "мах"],
  beer: ["шар", "айраг"],
  bread: ["талх"],
  burger: ["сэндвич"],
  cake: ["бялуу", "нарийн", "боов"],
  candy: ["чихэр"],
  chicken: ["тахиа"],
  chocolate: ["шоколад"],
  coffee: ["кофе"],
  cola: ["ундаа"],
  cookie: ["жигнэмэг"],
  egg: ["өндөг"],
  eggs: ["өндөг"],
  fish: ["загас"],
  hamburger: ["сэндвич"],
  ice: ["зайрмаг"],
  juice: ["жүүс", "шүүс"],
  meat: ["мах"],
  milk: ["сүү"],
  noodle: ["гоймон"],
  noodles: ["гоймон"],
  pizza: ["пицца"],
  pork: ["гахайн", "мах"],
  pudding: ["амттан", "бялуу"],
  rice: ["будаа"],
  snack: ["амттан", "зууш"],
  soda: ["ундаа"],
  soup: ["шөл"],
  tea: ["цай"],
  vodka: ["архи"],
  water: ["ус"],
  wine: ["дарс"],
};

function normalizeTaxSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^0-9a-zа-яёөү]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTaxSearchTokens(value: string) {
  const tokens = normalizeTaxSearchText(value)
    .split(" ")
    .filter((token) => token.length >= 2);
  const expanded = new Set<string>();

  tokens.forEach((token) => {
    expanded.add(token);
    TAX_CODE_SYNONYMS[token]?.forEach((synonym) => expanded.add(synonym));
  });

  return Array.from(expanded);
}

function findBusinessCategory(
  categories: BusinessCategory[],
  id: string,
): BusinessCategory | null {
  for (const category of categories) {
    if (category.id === id) return category;
    const child = category.children
      ? findBusinessCategory(category.children, id)
      : null;
    if (child) return child;
  }
  return null;
}

function findBusinessCategoryByName(
  categories: BusinessCategory[],
  name: string | null,
): BusinessCategory | null {
  if (!name) return null;
  const normalizedName = name.trim().toLocaleLowerCase("mn");
  for (const category of categories) {
    if (category.name.trim().toLocaleLowerCase("mn") === normalizedName)
      return category;
    const child: BusinessCategory | null = category.children
      ? findBusinessCategoryByName(category.children, name)
      : null;
    if (child) return child;
  }
  return null;
}

function scoreTaxProductCode(entry: EbarimtTaxProductCode, tokens: string[]) {
  if (!tokens.length) return 0;

  const fields = [
    { value: entry.code, weight: 22 },
    { value: entry.name, weight: 12 },
    { value: entry.subClassName, weight: 8 },
    { value: entry.className, weight: 6 },
    { value: entry.groupName, weight: 4 },
  ].map((field) => {
    const normalized = normalizeTaxSearchText(field.value);
    return {
      ...field,
      normalized,
      words: normalized.split(" ").filter(Boolean),
    };
  });

  return tokens.reduce((score, token) => {
    let tokenScore = 0;

    fields.forEach((field) => {
      if (!field.normalized) return;
      if (field.normalized === token) {
        tokenScore = Math.max(tokenScore, field.weight * 2);
        return;
      }
      if (field.words.includes(token)) {
        tokenScore = Math.max(tokenScore, field.weight + 8);
        return;
      }
      if (field.normalized.startsWith(token)) {
        tokenScore = Math.max(tokenScore, field.weight + 5);
        return;
      }
      if (field.words.some((word) => word.startsWith(token))) {
        tokenScore = Math.max(tokenScore, field.weight + 4);
        return;
      }
      if (token.length >= 4 && field.normalized.includes(token)) {
        tokenScore = Math.max(tokenScore, field.weight);
      }
    });

    return score + tokenScore;
  }, 0);
}

function getTaxProductCodeSuggestions(query: string) {
  const tokens = getTaxSearchTokens(query);
  if (!tokens.length) return [];

  return EBARIMT_TAX_PRODUCT_CODES.map((entry) => ({
    entry,
    score: scoreTaxProductCode(entry, tokens),
  }))
    .filter((item) => item.score > 0)
    .sort(
      (a, b) => b.score - a.score || a.entry.code.localeCompare(b.entry.code),
    )
    .slice(0, 5)
    .map((item) => item.entry);
}

export function ProductFormModal({
  form,
  setForm,
  editingId,
  saving,
  categories,
  products = [],
  onSwitchToEdit,
  onClose,
  onSave,
}: Props) {
  const isPreorder = form.supplyType === "CHINA_PREORDER";
  const selectedCategory = useMemo(
    () => findBusinessCategory(categories, form.businessCategoryId),
    [categories, form.businessCategoryId],
  );
  const selectedCategoryTaxSearchText = useMemo(
    () => getCategoryTaxSearchText(selectedCategory),
    [selectedCategory],
  );
  const categoryDefaultTaxProductCode = useMemo(
    () =>
      getTaxProductCodeSuggestions(selectedCategoryTaxSearchText)[0] ?? null,
    [selectedCategoryTaxSearchText],
  );
  const taxProductCodeQuery = [
    form.taxProductCode,
    form.name,
    selectedCategoryTaxSearchText,
  ]
    .filter(Boolean)
    .join(" ");
  const taxProductCodeSuggestions = useMemo(
    () => getTaxProductCodeSuggestions(taxProductCodeQuery),
    [taxProductCodeQuery],
  );
  const selectedTaxProductCode = useMemo(
    () =>
      EBARIMT_TAX_PRODUCT_CODES.find(
        (entry) => entry.code === form.taxProductCode.trim(),
      ),
    [form.taxProductCode],
  );
  const isTaxProductCodeRequired = TAX_PRODUCT_CODE_REQUIRED_TYPES.has(
    form.taxType,
  );
  const applyBusinessCategory = (id: string) => {
    const category = findBusinessCategory(categories, id);
    const defaultTaxProductCode =
      getTaxProductCodeSuggestions(getCategoryTaxSearchText(category))[0]
        ?.code || "";

    setForm((current) => ({
      ...current,
      businessCategoryId: id,
      taxProductCode: current.taxProductCode.trim()
        ? current.taxProductCode
        : defaultTaxProductCode,
    }));
  };
  const duplicateProduct =
    form.sku || form.barcode
      ? products.find((p) => {
          const skuMatch =
            form.sku && p.sku?.toLowerCase() === form.sku.toLowerCase();
          const barcodeMatch =
            form.barcode &&
            p.barcode?.toLowerCase() === form.barcode.toLowerCase();
          return (skuMatch || barcodeMatch) && p.id !== editingId;
        })
      : undefined;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-5 border-b border-slate-100 bg-white z-10 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {editingId
                ? "Бараа засах"
                : isPreorder
                  ? "Захиалгын бараа бүртгэх"
                  : "Шинэ бараа бүртгэх"}
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-1">
              {isPreorder
                ? "Хятадаас захиалгаар ирэх барааны мэдээллийг тусад нь бүртгэнэ."
                : "Бэлэн байгаа барааны мэдээллийг доорх талбаруудад оруулна уу"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="hidden sm:flex w-10 h-10 rounded-full items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <form id="product-form" onSubmit={onSave} className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Basic Info */}
              <div className="lg:col-span-7 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Type size={16} className="text-indigo-500" />
                    Үндсэн мэдээлэл
                  </h3>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Барааны нэр <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all placeholder:text-slate-400"
                      placeholder="Жишээ: Цэвэр ус 0.5л"
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          name: e.target.value,
                          masterProductId: "",
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <VendorSkuGenerator
                      productName={form.name}
                      products={products}
                      value={form.sku || ""}
                      onChange={(sku) => setForm((f) => ({ ...f, sku }))}
                    />
                    {duplicateProduct && (
                      <div className="flex flex-col gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl mt-2 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle
                            size={16}
                            className="text-amber-500 mt-0.5 shrink-0"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-amber-800 leading-tight">
                              Бүртгэлтэй код олдлоо!
                            </p>
                            <p className="text-xs text-amber-600 mt-0.5">
                              Энэ SKU эсвэл Barcode{" "}
                              <span className="font-bold">
                                {duplicateProduct.name}
                              </span>{" "}
                              бараанд ашиглагдаж байна.
                            </p>
                          </div>
                        </div>
                        {onSwitchToEdit && (
                          <button
                            type="button"
                            onClick={() => onSwitchToEdit(duplicateProduct)}
                            className="flex items-center justify-center gap-1.5 w-full bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold py-2 rounded-lg transition-colors"
                          >
                            Тус барааны мэдээллийг засах{" "}
                            <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Баркод (Barcode)
                    </label>
                    <div className="relative">
                      <PackageSearch
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all placeholder:text-slate-400"
                        placeholder="Жишээ: 865604212512"
                        value={form.barcode}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            barcode: e.target.value,
                            masterProductId: "",
                          }))
                        }
                      />
                    </div>
                  </div>

                  <MasterCatalogSuggestions
                    name={form.name}
                    barcode={form.barcode}
                    selectedId={form.masterProductId}
                    disabled={Boolean(editingId)}
                    onSelect={(product) => {
                      const matchedCategory = findBusinessCategoryByName(
                        categories,
                        product.categoryName,
                      );
                      setForm((current) => ({
                        ...current,
                        masterProductId: product.id,
                        name: product.canonicalName,
                        barcode: product.barcode || current.barcode,
                        description: current.description.trim()
                          ? current.description
                          : product.description || "",
                        images:
                          current.images.length > 0 || !product.imageUrl
                            ? current.images
                            : [product.imageUrl],
                        businessCategoryId:
                          current.businessCategoryId ||
                          matchedCategory?.id ||
                          "",
                      }));
                    }}
                  />
                </div>

                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Banknote size={16} className="text-emerald-500" />
                    Үнэ & Нөөц
                  </h3>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Авсан үнэ (₮)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                          ₮
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all font-medium"
                          placeholder="0"
                          value={form.costPrice}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              costPrice: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                          Бөөний үнэ (₮)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-medium outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                          placeholder="Тохируулаагүй"
                          value={form.wholesalePrice}
                          onChange={(e) =>
                            setForm((current) => ({
                              ...current,
                              wholesalePrice: e.target.value,
                            }))
                          }
                        />
                      </div>
                      {!isPreorder && (
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">
                            Захиалгын үнэ (₮)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                            placeholder="Тохируулаагүй"
                            value={form.orderPrice}
                            onChange={(e) =>
                              setForm((current) => ({
                                ...current,
                                orderPrice: e.target.value,
                              }))
                            }
                          />
                        </div>
                      )}
                    </>

                    {isPreorder ? (
                      <PreorderCurrencyPriceInput
                        amount={form.price}
                        currency={form.preorderPriceCurrency}
                        onAmountChange={(price) =>
                          setForm((current) => ({ ...current, price }))
                        }
                        onCurrencyChange={(preorderPriceCurrency) =>
                          setForm((current) => ({
                            ...current,
                            preorderPriceCurrency,
                          }))
                        }
                      />
                    ) : (
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                          Ширхэгийн үнэ (₮){" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                            ₮
                          </span>
                          <input
                            required
                            type="number"
                            min="0"
                            step="1"
                            className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all font-medium"
                            placeholder="0"
                            value={form.price}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, price: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    )}

                    {!isPreorder && (
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                          Нөөц (ширхэг)
                        </label>
                        <div className="relative">
                          <BarChart2
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            type="number"
                            min="0"
                            max="2147483647"
                            className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-medium"
                            placeholder="0"
                            value={form.stock}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, stock: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    )}

                    {!isPreorder && (
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                          Дуусах хугацаа
                        </label>
                        <div className="relative">
                          <CalendarClock
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            type="date"
                            className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-medium"
                            value={form.expiryDate}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                expiryDate: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                    <div className="mb-3">
                      <p className="text-sm font-bold text-emerald-800">
                        eBarimt татварын тохиргоо
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-emerald-700">
                        POS дээр сагслахад татвар болон eBarimt payload-д
                        ашиглагдана.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                          Татварын төрөл
                        </label>
                        <select
                          className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                          value={form.taxType}
                          onChange={(event) => {
                            const taxType = event.currentTarget
                              .value as FormState["taxType"];
                            setForm((current) => ({
                              ...current,
                              taxType,
                            }));
                          }}
                        >
                          {TAX_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                          Хотын татвар (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                          value={form.cityTaxRate}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              cityTaxRate: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                          Ангиллын код
                        </label>
                        <input
                          className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                          placeholder="4711000"
                          value={form.classificationCode}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              classificationCode: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="text-sm font-semibold text-slate-700">
                            Татварын ангиллын код (Tax product code)
                          </label>
                          {selectedTaxProductCode && (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                              {selectedTaxProductCode.name}
                            </span>
                          )}
                        </div>
                        <input
                          className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                          placeholder="Код эсвэл нэрээр хайх"
                          value={form.taxProductCode}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              taxProductCode: e.target.value,
                            }))
                          }
                        />
                        {isTaxProductCodeRequired &&
                          !form.taxProductCode.trim() && (
                            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
                              Энэ татварын төрөлд taxProductCode шаардлагатай.
                              Доорх саналуудаас хамгийн ойрыг нь сонгоно уу.
                            </p>
                          )}
                        {taxProductCodeSuggestions.length > 0 && (
                          <div className="overflow-hidden rounded-xl border border-emerald-100 bg-white">
                            {taxProductCodeSuggestions.map((entry) => (
                              <button
                                key={entry.code}
                                type="button"
                                onClick={() =>
                                  setForm((f) => ({
                                    ...f,
                                    taxProductCode: entry.code,
                                  }))
                                }
                                className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-emerald-50 ${
                                  form.taxProductCode.trim() === entry.code
                                    ? "bg-emerald-50"
                                    : ""
                                }`}
                              >
                                <span className="mt-0.5 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-700">
                                  {entry.code}
                                </span>
                                <span className="min-w-0">
                                  <span className="block text-sm font-bold text-slate-800">
                                    {entry.name}
                                  </span>
                                  <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">
                                    {entry.className ||
                                      entry.groupName ||
                                      entry.subClassName}
                                  </span>
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {isPreorder && (
                  <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <PackageSearch size={16} className="text-blue-500" />
                      Захиалгын мэдээлэл
                    </h3>

                    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 space-y-4">
                      <div className="rounded-xl border border-blue-100 bg-white px-4 py-3">
                        <p className="text-sm font-bold text-blue-800">
                          Хятадаас захиалгаар ирэх бараа
                        </p>
                        <p className="mt-1 text-xs font-medium leading-5 text-blue-600">
                          Энэ бараа POS кассын бэлэн нөөцөд орохгүй. Web дээр
                          захиалгаар ирэх хэсэгт тусдаа харагдана.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[160px_140px_1fr]">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">
                            Дүүрэх хүний тоо{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="1000000"
                            step="1"
                            required
                            className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                            value={form.preorderCapacity}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                preorderCapacity: e.target.value,
                              }))
                            }
                          />
                          <p className="text-xs font-medium text-slate-500">
                            Жишээ: 50 гэвэл 50 хүн захиалахад дүүрнэ.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">
                            Ирэх хоног
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="365"
                            className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                            value={form.preorderLeadTimeDays}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                preorderLeadTimeDays: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">
                            Нэмэлт тайлбар
                          </label>
                          <input
                            className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                            placeholder="Жишээ: Урьдчилгаа төлөөд 14-21 хоногт ирнэ"
                            value={form.preorderNote}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                preorderNote: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="rounded-xl border border-blue-100 bg-white p-4">
                        <div className="mb-4">
                          <h4 className="text-sm font-bold text-slate-900">
                            Нийлүүлэгчийн мэдээлэл
                          </h4>
                          <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                            Заавал оруулах шаардлагагүй. Оруулах бол урд болон
                            ард талын зургийг хамтад нь оруулна.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                          <ImageUploadGrid
                            images={
                              form.preorderSupplierFrontImageUrl
                                ? [form.preorderSupplierFrontImageUrl]
                                : []
                            }
                            onChange={(images) =>
                              setForm((current) => ({
                                ...current,
                                preorderSupplierFrontImageUrl: images[0] || "",
                              }))
                            }
                            maxImages={1}
                            label="Урд талын зураг"
                            addLabel="Урд зураг нэмэх"
                            primaryLabel="Урд тал"
                            helperText="Нийлүүлэгчийн мэдээллийн урд талыг тод бүтнээр нь оруулна."
                          />
                          <ImageUploadGrid
                            images={
                              form.preorderSupplierBackImageUrl
                                ? [form.preorderSupplierBackImageUrl]
                                : []
                            }
                            onChange={(images) =>
                              setForm((current) => ({
                                ...current,
                                preorderSupplierBackImageUrl: images[0] || "",
                              }))
                            }
                            maxImages={1}
                            label="Ард талын зураг"
                            addLabel="Ард зураг нэмэх"
                            primaryLabel="Ард тал"
                            helperText="Нийлүүлэгчийн мэдээллийн ард талыг тод бүтнээр нь оруулна."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <AlignLeft size={16} className="text-amber-500" />
                    Дэлгэрэнгүй
                  </h3>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Тайлбар
                    </label>
                    <textarea
                      rows={4}
                      className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all resize-none placeholder:text-slate-400"
                      placeholder="Барааны тухай дэлгэрэнгүй тайлбар..."
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                      }
                    />
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-amber-900">
                          Marketplace эхэнд гаргах
                        </p>
                        <p className="mt-1 text-xs font-medium leading-5 text-amber-700">
                          Асаасан бараа mglstore.mn дээр жагсаалт болон хайлтын
                          эхэнд гарна.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            marketplacePriority:
                              Number(f.marketplacePriority || 0) > 0
                                ? "0"
                                : "100",
                          }))
                        }
                        className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                          Number(form.marketplacePriority || 0) > 0
                            ? "bg-amber-500 text-white hover:bg-amber-600"
                            : "bg-white text-slate-600 ring-1 ring-amber-200 hover:bg-amber-100"
                        }`}
                      >
                        {Number(form.marketplacePriority || 0) > 0
                          ? "Асаалттай"
                          : "Унтраалттай"}
                      </button>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Дарааллын оноо
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="1000000"
                        step="1"
                        className="w-full h-12 px-4 rounded-xl border border-amber-200 bg-white text-slate-900 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all font-medium"
                        value={form.marketplacePriority}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            marketplacePriority: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Media & Classification */}
              <div className="lg:col-span-5 space-y-6">
                <ProductDataAssistantPanel
                  form={form}
                  categories={categories}
                  products={products}
                  editingId={editingId}
                  onApplyCategory={(id) => applyBusinessCategory(id)}
                  onApplyDescription={(description) =>
                    setForm((current) => ({ ...current, description }))
                  }
                  onSwitchToEdit={onSwitchToEdit}
                />

                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Ангилал
                    </label>
                    <CategorySelector
                      categories={categories}
                      value={form.businessCategoryId}
                      onChange={applyBusinessCategory}
                    />
                    {categoryDefaultTaxProductCode && (
                      <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold leading-5 text-emerald-700">
                        Ангиллын eBarimt default:{" "}
                        <span className="font-black">
                          {categoryDefaultTaxProductCode.code}
                        </span>{" "}
                        {categoryDefaultTaxProductCode.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                  <ImageUploadGrid
                    images={form.images}
                    onChange={(imgs) =>
                      setForm((f) => ({ ...f, images: imgs }))
                    }
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-6 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          >
            Болих
          </button>
          <button
            type="submit"
            form="product-form"
            disabled={saving}
            className="flex items-center gap-2 h-11 px-8 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 disabled:hover:bg-indigo-600 disabled:active:scale-100 transition-all"
          >
            {saving && <Loader2 size={18} className="animate-spin" />}
            {editingId ? "Хадгалах" : "Бүртгэх"}
          </button>
        </div>
      </div>
    </div>
  );
}
