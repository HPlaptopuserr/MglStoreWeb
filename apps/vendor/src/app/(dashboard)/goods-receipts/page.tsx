"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Minus,
  PackageCheck,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { API, authFetch } from "@/lib/api";

type ProductOption = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  stock: number;
  isActive?: boolean;
  supplyType?: string;
};

type PosRegisterOption = {
  id: string;
  name: string;
  label?: string | null;
  branchId: string;
  branch: { id: string; name: string };
};

type ReceiptLine = {
  id: string;
  product: ProductOption;
  quantity: number;
  batchNumber: string;
  expiryDate: string;
};

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

  const totalQuantity = lines.reduce((total, line) => total + line.quantity, 0);

  const createReceiptLine = (product: ProductOption): ReceiptLine => ({
    id: `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    product,
    quantity: 1,
    batchNumber: "",
    expiryDate: "",
  });

  const addProduct = (product: ProductOption) => {
    setLines((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.id === existing.id
            ? { ...line, quantity: Math.min(1_000_000, line.quantity + 1) }
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

  const setQuantity = (lineId: string, quantity: number) => {
    const safeQuantity = Math.min(
      1_000_000,
      Math.max(1, Math.floor(Number(quantity) || 1)),
    );
    setLines((current) =>
      current.map((line) =>
        line.id === lineId ? { ...line, quantity: safeQuantity } : line,
      ),
    );
  };

  const setLotField = (
    lineId: string,
    field: "batchNumber" | "expiryDate",
    value: string,
  ) => {
    setLines((current) =>
      current.map((line) =>
        line.id === lineId ? { ...line, [field]: value } : line,
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
    const product = exact || matchingProducts[0];
    if (product) {
      addProduct(product);
    } else if (normalizedSearch) {
      setSubmitError("Бараа олдсонгүй. Нэр, SKU эсвэл баркодоо шалгана уу.");
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
            productId: line.product.id,
            quantity: line.quantity,
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black text-slate-950">
              Бараа хүлээн авах
            </h1>
            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-700">
              POS хүлээн авалт
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Агуулахын хүлээн авалтаас тусдаа, касс/салбарын борлуулах үлдэгдэлд
            бараа нэмнэ.
          </p>
        </div>
        <Link
          href="/products"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" />
          Шинэ бүтээгдэхүүн бүртгэх
        </Link>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {loadError}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-black">Бараа амжилттай хүлээн авлаа</p>
            <p className="mt-0.5 text-xs font-semibold">
              {success.supplierName} · {success.totalItems} төрөл ·{" "}
              {success.totalQuantity.toLocaleString("mn-MN")} ширхэг · №
              {success.referenceNo}
            </p>
          </div>
        </div>
      )}

      {registers.length === 0 ? (
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
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-cyan-600" />
                <h2 className="text-base font-black text-slate-950">
                  Ерөнхий мэдээлэл
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Хүлээн авах касс / салбар
                  </span>
                  <div className="relative">
                    <select
                      value={selectedRegisterId}
                      onChange={(event) =>
                        setSelectedRegisterId(event.target.value)
                      }
                      className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm font-bold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    >
                      {registers.map((register) => (
                        <option key={register.id} value={register.id}>
                          {register.branch.name} ·{" "}
                          {register.label || register.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Нийлүүлэгч байгууллага{" "}
                    <span className="text-rose-500">*</span>
                  </span>
                  <input
                    value={supplierName}
                    maxLength={160}
                    onChange={(event) => setSupplierName(event.target.value)}
                    placeholder="Жишээ: Нийлүүлэгч ХХК"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Регистр / ТТД
                  </span>
                  <input
                    value={supplierRegisterNo}
                    maxLength={32}
                    onChange={(event) =>
                      setSupplierRegisterNo(event.target.value)
                    }
                    placeholder="Заавал биш"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Падаан / баримтын №
                  </span>
                  <input
                    value={documentNo}
                    maxLength={80}
                    onChange={(event) => setDocumentNo(event.target.value)}
                    placeholder="Заавал биш"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                </label>
              </div>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Тэмдэглэл
                </span>
                <textarea
                  value={note}
                  maxLength={500}
                  rows={2}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Жолооч, хүргэлт эсвэл бусад тайлбар"
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </label>
              <p className="mt-2 text-xs text-slate-500">
                Нийлүүлэгч системд бүртгэлтэй байх шаардлагагүй. Ямар ч
                байгууллагын нэрийг шууд оруулж болно.
              </p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-black text-slate-950">
                    Хүлээн авах бараа
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
                {normalizedSearch && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                    {matchingProducts.length > 0 ? (
                      matchingProducts.map((product) => (
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
                              {Number(product.stock || 0).toLocaleString(
                                "mn-MN",
                              )}
                            </p>
                          </div>
                          <Plus className="h-4 w-4 shrink-0 text-cyan-600" />
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-5 text-center">
                        <p className="text-xs font-semibold text-slate-500">
                          Тохирох бараа олдсонгүй
                        </p>
                        <Link
                          href="/products"
                          className="mt-2 inline-block text-xs font-black text-cyan-700"
                        >
                          Шинэ бүтээгдэхүүн бүртгэх
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-2">
                {lines.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                    <PackageCheck className="mx-auto h-9 w-9 text-slate-300" />
                    <p className="mt-2 text-sm font-bold text-slate-500">
                      Хүлээн авах бараа нэмээгүй байна
                    </p>
                  </div>
                ) : (
                  lines.map((line) => (
                    <div
                      key={line.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3"
                    >
                      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-900">
                            {line.product.name}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">
                            {line.product.sku ||
                              line.product.barcode ||
                              "Кодгүй"}{" "}
                            · Одоогийн үлдэгдэл{" "}
                            {Number(line.product.stock || 0).toLocaleString(
                              "mn-MN",
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
                          <button
                            type="button"
                            aria-label={`${line.product.name} тоо хасах`}
                            onClick={() =>
                              setQuantity(line.id, line.quantity - 1)
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={1_000_000}
                            value={line.quantity}
                            onChange={(event) =>
                              setQuantity(line.id, Number(event.target.value))
                            }
                            className="h-7 w-16 text-center text-sm font-black outline-none"
                          />
                          <button
                            type="button"
                            aria-label={`${line.product.name} тоо нэмэх`}
                            onClick={() =>
                              setQuantity(line.id, line.quantity + 1)
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          aria-label={`${line.product.name} устгах`}
                          onClick={() =>
                            setLines((current) =>
                              current.filter((item) => item.id !== line.id),
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 border-t border-slate-200 pt-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-bold text-slate-500">
                            Парт / лот №
                          </span>
                          <input
                            value={line.batchNumber}
                            maxLength={80}
                            onChange={(event) =>
                              setLotField(
                                line.id,
                                "batchNumber",
                                event.target.value,
                              )
                            }
                            placeholder="Заавал биш"
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[11px] font-bold text-slate-500">
                            Дуусах хугацаа
                          </span>
                          <input
                            type="date"
                            value={line.expiryDate}
                            onChange={(event) =>
                              setLotField(
                                line.id,
                                "expiryDate",
                                event.target.value,
                              )
                            }
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                          />
                        </label>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-[11px]">
                        <span className="text-slate-500">
                          Хугацаагүй бараа бол хоосон үлдээнэ.
                        </span>
                        <button
                          type="button"
                          onClick={() => addSeparateLot(line.product)}
                          className="shrink-0 font-black text-cyan-700 hover:text-cyan-800"
                        >
                          + Өөр парт нэмэх
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <aside>
            <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-black text-slate-950">
                Хүлээн авалтын дүн
              </h2>
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Салбар</span>
                  <span className="max-w-44 truncate text-right font-bold text-slate-900">
                    {selectedRegister?.branch.name || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Партын мөр</span>
                  <span className="font-black text-slate-900">
                    {lines.length}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-sm font-bold text-slate-700">
                    Нийт тоо ширхэг
                  </span>
                  <span className="text-xl font-black text-slate-950">
                    {totalQuantity.toLocaleString("mn-MN")}
                  </span>
                </div>
              </div>
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
                {submitting ? "Бүртгэж байна..." : "Бараа хүлээн авах"}
              </button>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500">
                Хүлээн авсан тоо үлдэгдэлд нэмэгдэж, хугацаа ойр парт
                борлуулалтаар түрүүлж хасагдана.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
