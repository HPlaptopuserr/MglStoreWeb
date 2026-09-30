"use client";

import { markedUpPrice } from "@/features/receive/receipt-pricing";
import { ReceiptMarkupControl } from "@/features/receive/ReceiptMarkupControl";
import { ReceiptSourceFields, type PosRegisterOption } from "@/features/receive/ReceiptSourceFields";
import { MasterCatalogSuggestions } from "@/features/products/components/MasterCatalogSuggestions";
import type { MasterCatalogProduct } from "@/features/products/types";
import { ReceiptLinesTable } from "@/features/receive/ReceiptLinesTable";
import type { ProductOption, ReceiptLine } from "@/features/receive/receipt-types";
import { ReceiptDocumentHeader } from "@/features/receive/ReceiptDocumentHeader";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  PackageCheck,
  Plus,
  Search,
} from "lucide-react";
import { API, authFetch } from "@/lib/api";
import {
  QuickProductCreateModal,
  type CreatedReceiptProduct,
} from "@/features/receive/QuickProductCreateModal";
import { GoodsReceiptDocumentList } from "@/features/receive/GoodsReceiptDocumentList";
import {
  formatPosQuantity,
  normalizePosMeasureUnit,
  POS_WEIGHT_STEP_KG,
  roundPosQuantity,
  toPosStoredStockQuantity,
} from "@mgl/types";

type GoodsReceiptResult = {
  id: string;
  referenceNo: string;
  supplierName: string;
  totalItems: number;
  totalQuantity: number;
  items: Array<{ productId: string; stockQty: number }>;
};

const SELECTED_REGISTER_KEY = "vendor_goods_receipt_register_id";

const normalize = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLocaleLowerCase("mn-MN");

const getOrganizationId = () => {
  try {
    const user = JSON.parse(localStorage.getItem("vendor_user") || "{}");
    if (user.organizationId) return String(user.organizationId);
    const token = localStorage.getItem("vendor_token");
    const payload = token ? JSON.parse(atob(token.split(".")[1] || "")) : null;
    return payload?.organizationId ? String(payload.organizationId) : "";
  } catch {
    return "";
  }
};

async function readJson<T>(response: Response, fallbackMessage: string) {
  const data = (await response.json().catch(() => ({}))) as T & {
    message?: string;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.message || data.error || fallbackMessage);
  }
  return data;
}

export default function GoodsReceiptsPage() {
  const [markup, setMarkup] = useState("");
  const changeMarkup = (value: string) => {
    setMarkup(value);
    setLines((current) =>
      current.map((line) =>
        line.manualPrice
          ? line
          : { ...line, salePrice: markedUpPrice(line.unitCost, value) },
      ),
    );
  };
  const searchRef = useRef<HTMLInputElement>(null);
  const [registers, setRegisters] = useState<PosRegisterOption[]>([]);
  const [selectedRegisterId, setSelectedRegisterId] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierRegisterNo, setSupplierRegisterNo] = useState("");
  const [documentNo, setDocumentNo] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<ReceiptLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState<GoodsReceiptResult | null>(null);
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [initialMaster, setInitialMaster] = useState<MasterCatalogProduct | null>(null);
  const [newProductCode, setNewProductCode] = useState("");

  const loadData = useCallback(async () => {
    const organizationId = getOrganizationId();
    if (!organizationId) {
      setLoadError("Байгууллагын мэдээлэл олдсонгүй. Дахин нэвтэрнэ үү.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");
    try {
      const productParams = new URLSearchParams({
        organizationId,
        includeInactive: "1",
        includeExpiredInventory: "1",
      });
      const [registerResponse, productResponse] = await Promise.all([
        authFetch(`${API}/pos/registers/mine`, { cache: "no-store" }),
        authFetch(`${API}/products?${productParams.toString()}`, {
          cache: "no-store",
        }),
      ]);
      const registerData = await readJson<PosRegisterOption[]>(
        registerResponse,
        "POS кассын жагсаалт авахад алдаа гарлаа",
      );
      const productData = await readJson<
        ProductOption[] | { products?: ProductOption[] }
      >(productResponse, "Барааны жагсаалт авахад алдаа гарлаа");

      const nextRegisters = Array.isArray(registerData) ? registerData : [];
      const rawProducts = Array.isArray(productData)
        ? productData
        : Array.isArray(productData.products)
          ? productData.products
          : [];
      const nextProducts = rawProducts.filter(
        (product) =>
          product.isActive !== false && product.supplyType !== "CHINA_PREORDER",
      );

      setRegisters(nextRegisters);
      setProducts(nextProducts);
      setSelectedRegisterId((current) => {
        const stored = localStorage.getItem(SELECTED_REGISTER_KEY) || "";
        const candidate = current || stored;
        return nextRegisters.some((register) => register.id === candidate)
          ? candidate
          : nextRegisters[0]?.id || "";
      });
    } catch (error) {
      setRegisters([]);
      setProducts([]);
      setSelectedRegisterId("");
      setLoadError(
        error instanceof Error
          ? error.message
          : "Хүлээн авалтын мэдээлэл ачаалахад алдаа гарлаа",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedRegisterId) {
      localStorage.setItem(SELECTED_REGISTER_KEY, selectedRegisterId);
    }
  }, [selectedRegisterId]);

  const selectedRegister = registers.find(
    (register) => register.id === selectedRegisterId,
  );
  const normalizedSearch = normalize(search);
  const matchingProducts = useMemo(() => {
    if (!normalizedSearch) return [];
    return products
      .filter((product) =>
        [product.name, product.sku, product.barcode].some((value) =>
          normalize(value).includes(normalizedSearch),
        ),
      )
      .slice(0, 12);
  }, [normalizedSearch, products]);

  const totalPieces = lines
    .filter((line) => normalizePosMeasureUnit(line.product.unit) === "pcs")
    .reduce((total, line) => total + line.quantity, 0);
  const totalWeight = lines
    .filter((line) => normalizePosMeasureUnit(line.product.unit) === "kg")
    .reduce((total, line) => total + line.quantity, 0);
  const totalPurchaseCost = lines.reduce((total, line) => {
    const unitCost = Number(line.unitCost);
    return total + (Number.isFinite(unitCost) ? unitCost * line.quantity : 0);
  }, 0);

  const createReceiptLine = (product: ProductOption): ReceiptLine => ({
    id: `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    product,
    quantity: 1,
    salePrice:
      product.manualReceiptPrice ??
      markedUpPrice(String(product.costPrice ?? ""), markup),
    manualPrice: product.manualReceiptPrice !== undefined,
    unitCost:
      product.costPrice == null || Number(product.costPrice) < 0
        ? ""
        : String(product.costPrice),
    batchNumber: "",
    expiryDate: "",
  });

  const addProduct = (product: ProductOption) => {
    setLines((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        const step = normalizePosMeasureUnit(product.unit) === "kg" ? 0.1 : 1;
        return current.map((line) =>
          line.id === existing.id
            ? {
                ...line,
                quantity: Math.min(
                  1_000_000,
                  roundPosQuantity(line.quantity + step, product.unit),
                ),
              }
            : line,
        );
      }
      return [...current, createReceiptLine(product)];
    });
    setSearch("");
    setSubmitError("");
    setSuccess(null);
    window.setTimeout(() => searchRef.current?.focus(), 0);
  };

  const addSeparateLot = (product: ProductOption) => {
    setLines((current) => [...current, createReceiptLine(product)]);
    setSubmitError("");
    setSuccess(null);
  };

  const openProductCreate = (code = search) => {
    setInitialMaster(null);
    setNewProductCode(code.trim());
    setCreateProductOpen(true);
    setSubmitError("");
  };

  const handleProductCreated = (product: CreatedReceiptProduct) => {
    const nextProduct: ProductOption = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      stock: Number(product.stock || 0),
      costPrice: product.costPrice,
      manualReceiptPrice: product.manualReceiptPrice,
      unit: product.unit,
      isActive: product.isActive,
      supplyType: product.supplyType,
    };
    setProducts((current) => [
      nextProduct,
      ...current.filter((item) => item.id !== nextProduct.id),
    ]);
    setCreateProductOpen(false);
    addProduct(nextProduct);
  };

  const setQuantity = (lineId: string, quantity: number) => {
    setLines((current) =>
      current.map((line) => {
        if (line.id !== lineId) return line;
        const unit = normalizePosMeasureUnit(line.product.unit);
        const minimum = unit === "kg" ? POS_WEIGHT_STEP_KG : 1;
        const safeQuantity = Math.min(
          1_000_000,
          Math.max(
            minimum,
            roundPosQuantity(Number(quantity) || minimum, unit),
          ),
        );
        return { ...line, quantity: safeQuantity };
      }),
    );
  };

  const setLotField = (
    lineId: string,
    field: "batchNumber" | "expiryDate" | "unitCost" | "salePrice",
    value: string,
  ) => {
    setLines((current) =>
      current.map((line) =>
        line.id === lineId
          ? {
              ...line,
              [field]: value,
              ...(field === "salePrice"
                ? { manualPrice: true }
                : field === "unitCost" && !line.manualPrice
                  ? { salePrice: markedUpPrice(value, markup) }
                  : {}),
            }
          : line,
      ),
    );
    setSubmitError("");
  };

  const handleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const exact = products.find((product) =>
      [product.sku, product.barcode].some(
        (value) => normalize(value) === normalizedSearch,
      ),
    );
    if (!normalizedSearch) return;
    const product = exact || (matchingProducts.length === 1 ? matchingProducts[0] : undefined);
    if (product) {
      addProduct(product);
    } else if (matchingProducts.length === 0) {
      openProductCreate(search);
    }
  };

  const submitReceipt = async () => {
    if (!selectedRegisterId) {
      setSubmitError("Хүлээн авах POS кассаа сонгоно уу.");
      return;
    }
    if (!supplierName.trim()) {
      setSubmitError("Нийлүүлэгч байгууллагын нэрийг оруулна уу.");
      return;
    }
    if (lines.length === 0) {
      setSubmitError("Хүлээн авах бараа нэмнэ үү.");
      return;
    }
    const invalidCostLine = lines.find((line) => {
      const cost = Number(line.unitCost);
      return !line.unitCost.trim() || !Number.isFinite(cost) || cost < 0;
    });
    if (invalidCostLine) {
      setSubmitError(
        `“${invalidCostLine.product.name}” барааны авсан үнийг оруулна уу.`,
      );
      return;
    }

    if (
      lines.some(
        (line) =>
          line.salePrice.trim() &&
          (!Number.isFinite(Number(line.salePrice)) ||
            Number(line.salePrice) < 0 ||
            Number(line.salePrice) > 1_000_000_000),
      )
    ) {
      setSubmitError("Зарах үнэ 0-1,000,000,000₮ хооронд байна.");
      return;
    }
    if (lines.some(line => line.product.id.startsWith("catalog:") && !line.salePrice.trim())) {
      setSubmitError("Шинэ барааны зарах үнийг баримтын мөрөнд оруулна уу."); return;
    }
    setSubmitting(true);
    setSubmitError("");
    setSuccess(null);
    try {
      const response = await authFetch(`${API}/pos/goods-receipts`, {
        method: "POST",
        body: JSON.stringify({
          registerId: selectedRegisterId,
          supplierName: supplierName.trim(),
          supplierRegisterNo: supplierRegisterNo.trim() || undefined,
          documentNo: documentNo.trim() || undefined,
          note: note.trim() || undefined,
          items: lines.map((line) => ({
            ...(line.product.id.startsWith("catalog:") ? { masterProductId: line.product.masterProductId } : { productId: line.product.id }),
            quantity: toPosStoredStockQuantity(
              line.quantity,
              line.product.unit,
            ),
            unitCost: Number(line.unitCost),
            salePrice: line.salePrice.trim()
              ? Number(line.salePrice)
              : undefined,
            batchNumber: line.batchNumber.trim() || undefined,
            expiryDate: line.expiryDate || undefined,
          })),
        }),
      });
      const receipt = await readJson<GoodsReceiptResult>(
        response,
        "Бараа хүлээн авахад алдаа гарлаа",
      );
      const stockByProduct = new Map(
        receipt.items.map((item) => [item.productId, item.stockQty]),
      );
      setProducts((current) =>
        current.map((product) =>
          stockByProduct.has(product.id)
            ? { ...product, stock: stockByProduct.get(product.id) || 0 }
            : product,
        ),
      );
      setSuccess(receipt);
      setSupplierName("");
      setSupplierRegisterNo("");
      setDocumentNo("");
      setNote("");
      setSearch("");
      setLines([]);
      void loadData();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Бараа хүлээн авахад алдаа гарлаа",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold text-slate-900">Бараа хүлээн авах</h1><p className="mt-1 text-sm text-slate-500">Орлогын баримтаа бөглөж, бараагаа үлдэгдэлд нэмнэ.</p></div>
        <button type="button" onClick={() => openProductCreate("")} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Plus size={16} /> Шинэ бараа</button>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {loadError}
          <button type="button" onClick={() => void loadData()} className="ml-3 underline">Дахин ачаалах</button>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-black">Бараа амжилттай хүлээн авлаа</p>
            <p className="mt-0.5 text-xs font-semibold">
              {success.supplierName} · {success.totalItems} төрөл · №
              {success.referenceNo}
            </p>
          </div>
        </div>
      )}

      {loadError ? null : registers.length === 0 ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
          <PackageCheck className="mx-auto h-10 w-10 text-amber-500" />
          <h2 className="mt-3 text-lg font-black text-amber-950">
            Идэвхтэй POS касс олдсонгүй
          </h2>
          <p className="mx-auto mt-1 max-w-lg text-sm text-amber-800">
            Барааг аль салбарын борлуулах үлдэгдэлд нэмэхийг тогтоохын тулд
            идэвхтэй POS касс шаардлагатай.
          </p>
          <Link
            href="/pos"
            className="mt-4 inline-flex h-10 items-center rounded-xl bg-amber-900 px-4 text-sm font-black text-white"
          >
            POS касс тохируулах
          </Link>
        </div>
      ) : (
        <fieldset disabled={submitting} className="min-w-0 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm disabled:opacity-70">
          <ReceiptDocumentHeader />
          <div className="space-y-0">
            <ReceiptSourceFields registers={registers} selectedRegisterId={selectedRegisterId} setSelectedRegisterId={setSelectedRegisterId} supplierName={supplierName} setSupplierName={setSupplierName} supplierRegisterNo={supplierRegisterNo} setSupplierRegisterNo={setSupplierRegisterNo} documentNo={documentNo} setDocumentNo={setDocumentNo} note={note} setNote={setNote} />

            <section className="border-b border-slate-200 p-4 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-black text-slate-950">
                    Барааны жагсаалт
                  </h2>
                  <p className="text-xs text-slate-500">
                    Нэр, SKU эсвэл баркодоор хайж нэмнэ
                  </p>
                </div>
                {lines.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setLines([])}
                    className="text-xs font-black text-rose-600 hover:text-rose-700"
                  >
                    Бүгдийг арилгах
                  </button>
                )}
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  aria-label="Барааг нэр, SKU, баркодоор хайх"
                  ref={searchRef}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setSubmitError("");
                  }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Баркод уншуулах эсвэл бараа хайх"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold outline-none focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
                />
                {normalizedSearch && matchingProducts.length > 0 && (
                  <div className="relative z-10 mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                    {matchingProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => addProduct(product)}
                          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-cyan-50"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">
                              {product.name}
                            </p>
                            <p className="truncate text-[11px] text-slate-500">
                              {product.sku || product.barcode || "Кодгүй"} ·
                              Одоо{" "}
                              {formatPosQuantity(
                                Number(product.stock || 0),
                                product.unit,
                              )}
                            </p>
                          </div>
                          <Plus className="h-4 w-4 shrink-0 text-cyan-600" />
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {normalizedSearch && matchingProducts.length === 0 && !createProductOpen && (
                <div className="mt-3">
                  <MasterCatalogSuggestions
                    name={search}
                    barcode={/^\d{4,}$/.test(search.trim()) ? search.trim() : ""}
                    selectedId=""
                    onSelect={(product) => {
                      addProduct({ id: `catalog:${product.id}`, masterProductId: product.id, name: product.canonicalName, barcode: product.barcode, unit: normalizePosMeasureUnit(product.unit), stock: 0 });
                    }}
                  />
                </div>
              )}
              <div className="mt-5 space-y-2">
                <details className="rounded-xl border border-slate-200 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-600">Зарах үнэ тооцох тохиргоо {markup ? `· +${markup}%` : "· Заавал биш"}</summary>
                  <div className="mt-3"><ReceiptMarkupControl value={markup} onChange={changeMarkup} /></div>
                </details>
                {lines.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                    <PackageCheck className="mx-auto h-9 w-9 text-slate-300" />
                    <p className="mt-2 text-sm font-bold text-slate-500">
                      Хүлээн авах бараа нэмээгүй байна
                    </p>
                  </div>
                ) : (
                  <ReceiptLinesTable lines={lines} total={totalPurchaseCost} onQuantity={setQuantity} onField={setLotField} onRemove={(id) => setLines(current => current.filter(line => line.id !== id))} onAddLot={addSeparateLot} onAutomaticPrice={(id) => setLines(current => current.map(line => line.id === id ? { ...line, manualPrice: false, salePrice: markedUpPrice(line.unitCost, markup) } : line))} />
                )}
              </div>
            </section>
          </div>

          <footer className="grid gap-6 bg-slate-50/50 p-4 sm:p-6 md:grid-cols-2">
            <div className="text-sm leading-6 text-slate-500"><p className="font-semibold text-slate-800">Баримтыг шалгаад баталгаажуулна уу</p><p className="mt-2">Нийлүүлэгч, хүлээн авах салбар, тоо хэмжээ болон үнийг нягтална уу. Баталгаажуулсны дараа баримтын дугаар үүсэж, үлдэгдэл нэмэгдэнэ.</p><p className="mt-4 text-xs">Зарах үнэ бөглөсөн мөрийн борлуулах үнэ мөн шинэчлэгдэнэ.</p></div>
            <div className="md:ml-auto w-full max-w-md">
              <h2 className="text-base font-black text-slate-950">
                Баримтын дүн
              </h2>
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Салбар</span>
                  <span className="max-w-44 truncate text-right font-bold text-slate-900">
                    {selectedRegister?.branch.name || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Барааны багц</span>
                  <span className="font-black text-slate-900">
                    {lines.length}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-sm font-bold text-slate-700">
                    Нийт хүлээн авах
                  </span>
                  <span className="text-xl font-black text-slate-950">
                    {[
                      totalPieces > 0
                        ? formatPosQuantity(totalPieces, "pcs")
                        : "",
                      totalWeight > 0
                        ? formatPosQuantity(totalWeight, "kg")
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" · ") || "0"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-700">
                    Нийт авсан өртөг
                  </span>
                  <span className="font-black text-cyan-700">
                    {new Intl.NumberFormat("mn-MN").format(totalPurchaseCost)}₮
                  </span>
                </div>
              </div>
              {(!supplierName.trim() || lines.length === 0) && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{!supplierName.trim() ? "Нийлүүлэгчийн нэрийг оруулна уу. " : ""}{lines.length === 0 ? "Хүлээн авах бараагаа хайж нэмнэ үү." : ""}</p>}
              {submitError && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  {submitError}
                </div>
              )}
              <button
                type="button"
                disabled={
                  submitting ||
                  !selectedRegisterId ||
                  !supplierName.trim() ||
                  lines.length === 0
                }
                onClick={() => void submitReceipt()}
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 text-sm font-black text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PackageCheck className="h-4 w-4" />
                )}
                {submitting ? "Бүртгэж байна..." : "Баримтыг баталгаажуулж хүлээн авах"}
              </button>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500">
                Хүлээн авсан тоо үлдэгдэлд нэмэгдэнэ. Ижил барааны хугацаа,
                авсан үнэ өөр бол тусдаа багц болгон нэмнэ. Хугацаа ойр багц
                борлуулалтаар түрүүлж хасагдана.
              </p>
            </div>
          </footer>
        </fieldset>
      )}
      {!loading && (
        <GoodsReceiptDocumentList
          registerId={selectedRegisterId}
          refreshKey={success?.id ?? ""}
        />
      )}
      <QuickProductCreateModal
        markupPercent={markup}
        open={createProductOpen}
        organizationId={getOrganizationId()}
        initialCode={newProductCode}
        initialMaster={initialMaster}
        onClose={() => setCreateProductOpen(false)}
        onCreated={handleProductCreated}
      />
    </div>
  );
}
