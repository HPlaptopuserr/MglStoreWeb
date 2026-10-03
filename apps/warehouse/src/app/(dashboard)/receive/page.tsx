"use client";
import { useWarehouseReceiptDraft } from "@/features/receive/useWarehouseReceiptDraft";
import { classifyReceiptSearch } from "@/features/receive/receipt-product-search";

import { useEffect, useState, useRef, useMemo } from "react";
import NextImage from "next/image";
import {
  Loader2,
  ChevronDown,
  PackageCheck,
  Check,
  X,
  Upload,
  Image as ImageIcon,
  FilePlus2,
  History,
} from "lucide-react";
import SkuGenerator from "@/components/SkuGenerator";
import { ExcelImportModal } from "@/components/ExcelImportModal";
import { API, wmsFetch } from "@/lib/api";
import { WarehouseCategoryPicker } from "@/features/categories";
import { type WarehouseVendorProduct } from "@/features/receive/WarehouseVendorProductResults";
import { useWarehouseScope } from "@/features/warehouse-scope/WarehouseScopeProvider";
import { WarehouseGoodsReceiptHistory } from "@/features/receive/WarehouseGoodsReceiptHistory";

import type { ReceiveItem } from "@/features/receive/receipt-types";
import { WarehouseReceiptWizard } from "@/features/receive/WarehouseReceiptWizard";
import { WarehouseReceiptProducts } from "@/features/receive/WarehouseReceiptProducts";

type Product = WarehouseVendorProduct;

// ───── New Product Form State ─────
type NewProductForm = {
  name: string;
  description: string;
  sku: string;
  barcode: string;
  unit: string;
  price: string;
  costPrice: string;
  businessCategoryId: string;
  quantity: string;
  minQuantity: string;
  location: string;
  batchNumber: string;
  expiryDate: string;
  note: string;
  images: string[]; // URLs
  orgRegister: string;
};

const emptyProductForm: NewProductForm = {
  name: "",
  description: "",
  sku: "",
  barcode: "",
  unit: "",
  price: "",
  costPrice: "",
  businessCategoryId: "",
  quantity: "1",
  minQuantity: "0",
  location: "",
  batchNumber: "",
  expiryDate: "",
  note: "",
  images: [],
  orgRegister: "",
};

export default function ReceivePage() {
  const { selectedWarehouse, selectedWarehouseId } = useWarehouseScope();
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [items, setItems] = useState<ReceiveItem[]>([]);
  const [supplier, setSupplier] = useState("");
  const [supplierRegisterNumber, setSupplierRegisterNumber] = useState("");
  const [supplierDocumentNumber, setSupplierDocumentNumber] = useState("");
  const [documentDate, setDocumentDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [note, setNote] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [savedReceiptNumber, setSavedReceiptNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeView, setActiveView] = useState<"create" | "history">("history");
  const [hasStartedReceipt, setHasStartedReceipt] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [pendingReceiptId, setPendingReceiptId] = useState<string | null>(null);

  const [receiptStep, setReceiptStep] = useState<0 | 1 | 2>(0);
  const receiptDraft = useMemo(
    () => ({
      items,
      supplier,
      supplierRegisterNumber,
      supplierDocumentNumber,
      documentDate,
      note,
      productSearch,
      receiptFiles,
      pendingReceiptId,
      hasStartedReceipt,
      step: receiptStep,
    }),
    [
      items,
      supplier,
      supplierRegisterNumber,
      supplierDocumentNumber,
      documentDate,
      note,
      productSearch,
      receiptFiles,
      pendingReceiptId,
      hasStartedReceipt,
      receiptStep,
    ],
  );
  const { status: draftStatus, restoring: restoringDraft } =
    useWarehouseReceiptDraft(selectedWarehouseId, receiptDraft, (draft) => {
      setItems(draft?.items ?? []);
      setSupplier(draft?.supplier ?? "");
      setSupplierRegisterNumber(draft?.supplierRegisterNumber ?? "");
      setSupplierDocumentNumber(draft?.supplierDocumentNumber ?? "");
      setDocumentDate(
        draft?.documentDate ?? new Date().toISOString().slice(0, 10),
      );
      setNote(draft?.note ?? "");
      setProductSearch(draft?.productSearch ?? "");
      setReceiptFiles(draft?.receiptFiles ?? []);
      setPendingReceiptId(draft?.pendingReceiptId ?? null);
      setHasStartedReceipt(draft?.hasStartedReceipt ?? false);
      setReceiptStep(draft?.step ?? 0);
      setActiveView(draft ? "create" : "history");
      setSaved(false);
      setSubmitError("");
    });

  // Organization name for SKU generator
  const [organizationName, setOrganizationName] = useState("");

  // New product modal
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [productForm, setProductForm] =
    useState<NewProductForm>(emptyProductForm);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [productError, setProductError] = useState("");

  // Image upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Excel import modal
  const [showImportModal, setShowImportModal] = useState(false);

  const searchWarehouseId = selectedWarehouse?.id || "";

  // Resolve the organization name for SKU generation from the active scope.
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("wms_user") || "{}") as {
      organizationName?: string;
    };
    setOrganizationName(
      user.organizationName ||
        selectedWarehouse?.organizations?.[0]?.name ||
        selectedWarehouse?.name ||
        "",
    );
  }, [selectedWarehouse]);

  useEffect(() => {
    const controller = new AbortController();
    setSearchResults([]);
    setSearchError("");
    if (productSearch.trim().length < 2 || !searchWarehouseId) {
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await wmsFetch(
          `${API}/warehouses/${encodeURIComponent(searchWarehouseId)}/products?search=${encodeURIComponent(productSearch.trim())}&limit=10`,
          {
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(15_000),
            ]),
          },
        );
        if (!res.ok)
          throw new Error("Бараа хайхад алдаа гарлаа. Дахин хайна уу.");
        const data = await res.json();
        if (!controller.signal.aborted) {
          setSearchResults(
            Array.isArray(data) ? data : data.products || data.data || [],
          );
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setSearchError(
            error instanceof Error
              ? error.message
              : "Бараа хайхад алдаа гарлаа.",
          );
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [productSearch, searchWarehouseId, searchAttempt]);

  const addItem = (product: Product) => {
    if (items.find((i) => i.productId === product.id)) return;
    setItems([
      ...items,
      {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit || "pcs",
        barcode: product.barcode,
        barcodeAliases: product.barcodeAliases || [],
        quantity: 1,
        cost: Number(product.price) || 0,
        batchNumber: "",
        expiryDate: "",
        location: "",
      },
    ]);
    setProductSearch("");
    setSearchResults([]);
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (!Number.isInteger(qty) || qty < 1 || qty > 1000000) return;
    setItems(
      items.map((i) =>
        i.productId === productId ? { ...i, quantity: qty } : i,
      ),
    );
  };

  const updateCost = (productId: string, cost: number) => {
    setItems(
      items.map((i) => (i.productId === productId ? { ...i, cost } : i)),
    );
  };

  const updateItemMetadata = (
    productId: string,
    field: "batchNumber" | "expiryDate" | "location",
    value: string,
  ) => {
    setItems((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, [field]: value } : item,
      ),
    );
  };

  const removeItem = (productId: string) => {
    setItems(items.filter((i) => i.productId !== productId));
  };

  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalCost = items.reduce((sum, i) => sum + i.quantity * i.cost, 0);
  const selectedProductIds = new Set(items.map((item) => item.productId));

  // ───── Image handling (convert to base64 data URL) ─────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (productForm.images.length >= 5) return;

    setUploadingImage(true);

    const remaining = 5 - productForm.images.length;
    const toProcess = Array.from(files).slice(0, remaining);

    Promise.all(
      toProcess.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          }),
      ),
    ).then((dataUrls) => {
      setProductForm((prev) => ({
        ...prev,
        images: [...prev.images, ...dataUrls],
      }));
      setUploadingImage(false);
    });

    // Reset input
    e.target.value = "";
  };

  const removeImage = (idx: number) => {
    setProductForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx),
    }));
  };

  // ───── Create new product via warehouse endpoint ─────
  const handleCreateProduct = async () => {
    if (!productForm.name.trim()) {
      setProductError("Барааны нэр шаардлагатай");
      return;
    }
    if (!productForm.price || parseFloat(productForm.price) < 0) {
      setProductError("Үнэ оруулна уу");
      return;
    }
    if (!selectedWarehouseId) {
      setProductError("Агуулах сонгоно уу");
      return;
    }

    setCreatingProduct(true);
    setProductError("");

    try {
      const res = await wmsFetch(
        `${API}/warehouses/${selectedWarehouseId}/products`,
        {
          method: "POST",
          body: JSON.stringify({
            name: productForm.name.trim(),
            description: productForm.description.trim() || null,
            sku: productForm.sku.trim() || null,
            barcode: productForm.barcode.trim() || null,
            unit: productForm.unit.trim() || null,
            price: parseFloat(productForm.price),
            costPrice: productForm.costPrice
              ? parseFloat(productForm.costPrice)
              : null,
            businessCategoryId: productForm.businessCategoryId || null,
            images: productForm.images,
            quantity: 0,
            minQuantity: parseInt(productForm.minQuantity) || 0,
            location: productForm.location.trim() || null,
            batchNumber: productForm.batchNumber.trim() || null,
            expiryDate: productForm.expiryDate || null,
            note: productForm.note.trim() || null,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        setProductError(data.message || "Алдаа гарлаа");
        setCreatingProduct(false);
        return;
      }

      // Add to receive list
      const qty = parseInt(productForm.quantity) || 0;
      if (qty > 0) {
        setItems((prev) => [
          ...prev,
          {
            productId: data.id,
            name: data.name,
            sku: data.sku,
            quantity: qty,
            cost: parseFloat(productForm.costPrice || productForm.price),
            batchNumber: productForm.batchNumber.trim(),
            expiryDate: productForm.expiryDate,
            location: productForm.location.trim(),
            isNew: true,
          },
        ]);
      }

      // Reset & close
      setProductForm(emptyProductForm);
      setShowNewProduct(false);
    } catch {
      setProductError("Серверт холбогдож чадсангүй");
    } finally {
      setCreatingProduct(false);
    }
  };

  // ───── Submit one atomic goods receipt ─────
  const handleSubmit = async () => {
    if (!selectedWarehouseId || items.length === 0 || !supplier.trim()) return;
    setSaving(true);
    setSaved(false);
    setSubmitError("");

    try {
      let receiptId = pendingReceiptId;
      let receiptNumber = "";
      if (!receiptId) {
        const resolvedItems = [...items];
        for (const item of resolvedItems) {
          if (
            item.draftProduct &&
            (!item.name.trim() ||
              (item.unit !== undefined && !item.unit.trim()) ||
              !item.draftProduct.price.trim() ||
              !Number.isFinite(Number(item.draftProduct.price)) ||
              Number(item.draftProduct.price) < 0 ||
              Number(item.draftProduct.price) > 1000000000)
          ) {
            throw new Error(
              "Шинэ барааны нэр, нэгж болон зарах үнийг зөв бөглөнө үү.",
            );
          }
        }
        for (let index = 0; index < resolvedItems.length; index++) {
          const item = resolvedItems[index];
          if (!item.draftProduct) continue;
          const response = await wmsFetch(
            `${API}/warehouses/${encodeURIComponent(selectedWarehouseId)}/products`,
            {
              method: "POST",
              body: JSON.stringify({
                name: item.name.trim(),
                sku: item.sku || `WH-${item.productId.slice(6)}`,
                barcode: item.draftProduct.barcode || null,
                masterProductId: item.draftProduct.masterProductId,
                description: item.draftProduct.description,
                businessCategoryId: item.draftProduct.businessCategoryId,
                images: item.draftProduct.imageUrl
                  ? [item.draftProduct.imageUrl]
                  : [],
                price: Number(item.draftProduct.price),
                costPrice: item.cost,
                quantity: 0,
                unit: item.unit?.trim() || "pcs",
              }),
            },
          );
          const product = (await response.json()) as {
            id: string;
            sku: string;
            message?: string;
          };
          if (!response.ok)
            throw new Error(product.message || "Шинэ бараа хадгалагдсангүй.");
          const resolved = {
            ...item,
            productId: product.id,
            sku: product.sku,
            draftProduct: undefined,
          };
          resolvedItems[index] = resolved;
          setItems((current) =>
            current.map((entry) =>
              entry.productId === item.productId ? resolved : entry,
            ),
          );
        }
        for (const item of resolvedItems) {
          if (!item.barcodeAliases?.length) continue;
          const response = await wmsFetch(
            `${API}/warehouses/${encodeURIComponent(selectedWarehouseId)}/products/${encodeURIComponent(item.productId)}/barcodes`,
            {
              method: "POST",
              body: JSON.stringify({ barcodes: item.barcodeAliases }),
            },
          );
          if (!response.ok) {
            const failure = (await response.json()) as { message?: string };
            throw new Error(failure.message || "Нэмэлт баркод хадгалагдсангүй");
          }
        }
        const response = await wmsFetch(`${API}/warehouse-goods-receipts`, {
          method: "POST",
          body: JSON.stringify({
            warehouseId: selectedWarehouseId,
            supplierName: supplier.trim(),
            supplierRegisterNumber: supplierRegisterNumber.trim() || null,
            supplierDocumentNumber: supplierDocumentNumber.trim() || null,
            documentDate,
            note: note.trim() || null,
            confirm: false,
            items: resolvedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitCost: item.cost,
              batchNumber: item.batchNumber || null,
              expiryDate: item.expiryDate || null,
              location: item.location || null,
            })),
          }),
        });
        const draft = await response.json().catch(() => null);
        if (!response.ok)
          throw new Error(draft?.message || "Орлогын падаан хадгалагдсангүй");
        receiptId = draft.id;
        receiptNumber = draft.receiptNumber;
        setPendingReceiptId(receiptId);
      }

      if (receiptFiles.length > 0) {
        const body = new FormData();
        receiptFiles.forEach((file) => body.append("files", file));
        const uploadResponse = await wmsFetch(
          `${API}/warehouse-goods-receipts/${receiptId}/attachments`,
          { method: "POST", body },
        );
        const uploadResult = await uploadResponse.json().catch(() => null);
        if (!uploadResponse.ok)
          throw new Error(
            uploadResult?.message || "Падааны файл хадгалагдсангүй",
          );
      }

      const confirmResponse = await wmsFetch(
        `${API}/warehouse-goods-receipts/${receiptId}/confirm`,
        { method: "PATCH" },
      );
      const result = await confirmResponse.json().catch(() => null);
      if (!confirmResponse.ok)
        throw new Error(result?.message || "Орлогын падаан баталгаажсангүй");

      setActiveView("history");
      setSaved(true);
      setSavedReceiptNumber(result.receiptNumber || receiptNumber);
      setHistoryRefreshKey((current) => current + 1);
      setPendingReceiptId(null);
      setReceiptFiles([]);
      setItems([]);
      setHasStartedReceipt(false);
      setReceiptStep(0);
      setSupplier("");
      setSupplierRegisterNumber("");
      setSupplierDocumentNumber("");
      setNote("");
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Хадгалахад алдаа гарлаа",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Нийлүүлэгч, баримтын мэдээлэл, бараагаа дарааллаар нь оруулаад
            хүлээн авна.
          </p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
            <Check className="h-4 w-4" />
            {savedReceiptNumber} амжилттай баталгаажлаа
          </div>
        )}
      </div>

      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
        <button
          type="button"
          disabled={!selectedWarehouseId || saving || restoringDraft}
          onClick={() => {
            setHasStartedReceipt(true);
            setActiveView("create");
          }}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeView === "create"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <FilePlus2 className="h-4 w-4" />
          Бараа хүлээн авах
        </button>
        <button
          type="button"
          onClick={() => setActiveView("history")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeView === "history"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <History className="h-4 w-4" />
          Падааны түүх
        </button>
      </div>

      {activeView === "history" && (
        <WarehouseGoodsReceiptHistory
          warehouseId={selectedWarehouseId}
          refreshKey={historyRefreshKey}
        />
      )}

      {draftStatus && (
        <p
          role="status"
          className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800"
        >
          {draftStatus}
        </p>
      )}
      {restoringDraft && (
        <p role="status" className="p-4 text-sm text-slate-500">
          Ноорог сэргээж байна…
        </p>
      )}
      {hasStartedReceipt && !restoringDraft && (
        <div hidden={activeView !== "create"}>
          <WarehouseReceiptWizard
            key={`${selectedWarehouseId}:${historyRefreshKey}`}
            step={receiptStep}
            onStepChange={setReceiptStep}
            source={{
              warehouseName: selectedWarehouse?.name,
              supplier,
              onSupplierChange: setSupplier,
              registerNumber: supplierRegisterNumber,
              onRegisterNumberChange: setSupplierRegisterNumber,
              documentNumber: supplierDocumentNumber,
              onDocumentNumberChange: setSupplierDocumentNumber,
              documentDate,
              onDocumentDateChange: setDocumentDate,
              note,
              onNoteChange: setNote,
              files: receiptFiles,
              onFilesChange: setReceiptFiles,
            }}
            warehouseId={selectedWarehouseId}
            submitting={saving}
            locked={Boolean(pendingReceiptId)}
            lineCount={items.length}
            totalQuantity={totalQuantity}
            totalCost={totalCost}
            error={submitError}
            onSubmit={() => void handleSubmit()}
            products={
              <WarehouseReceiptProducts
                key={selectedWarehouseId}
                productSearch={productSearch}
                setProductSearch={setProductSearch}
                searchResults={searchResults}
                searching={searching}
                searchError={searchError}
                onRetrySearch={() => setSearchAttempt((attempt) => attempt + 1)}
                items={items}
                onAddBarcode={(id, barcode) =>
                  setItems((current) =>
                    current.map((item) =>
                      item.productId === id
                        ? {
                            ...item,
                            barcodeAliases: [
                              ...new Set([
                                ...(item.barcodeAliases || []),
                                barcode,
                              ]),
                            ],
                          }
                        : item,
                    ),
                  )
                }
                onDraftProduct={(query, master) => {
                  const kind = classifyReceiptSearch(query);
                  setItems((current) =>
                    master &&
                    current.some(
                      (item) =>
                        item.draftProduct?.masterProductId === master.id,
                    )
                      ? current
                      : [
                          ...current,
                          {
                            productId: `draft:${crypto.randomUUID()}`,
                            name:
                              master?.canonicalName ||
                              (kind === "name" ? query : ""),
                            sku:
                              master?.suggestedSku ||
                              (kind === "sku" ? query : null),
                            unit: master?.unit || "pcs",
                            quantity: 1,
                            cost: 0,
                            batchNumber: "",
                            expiryDate: "",
                            location: "",
                            draftProduct: {
                              barcode:
                                master?.barcode ||
                                (kind === "barcode" ? query : ""),
                              price:
                                master?.suggestedPrice != null
                                  ? String(master.suggestedPrice)
                                  : "",
                              masterProductId: master?.id,
                              description: master?.description,
                              businessCategoryId: master?.businessCategoryId,
                              imageUrl: master?.imageUrl,
                            },
                          },
                        ],
                  );
                  setProductSearch("");
                  setSearchResults([]);
                }}
                onDraftChange={(id, field, value) =>
                  setItems((current) =>
                    current.map((item) =>
                      item.productId !== id
                        ? item
                        : field === "autoCode"
                          ? {
                              ...item,
                              sku: value,
                              draftProduct: item.draftProduct
                                ? { ...item.draftProduct, barcode: value }
                                : undefined,
                            }
                          : field === "barcode"
                            ? {
                                ...item,
                                draftProduct: item.draftProduct
                                  ? { ...item.draftProduct, barcode: value }
                                  : undefined,
                              }
                            : field === "unit"
                              ? { ...item, unit: value }
                              : field === "name"
                                ? { ...item, name: value }
                                : {
                                    ...item,
                                    draftProduct: item.draftProduct
                                      ? { ...item.draftProduct, price: value }
                                      : undefined,
                                  },
                    ),
                  )
                }
                selectedProductIds={selectedProductIds}
                warehouseId={selectedWarehouseId}
                organizationName={organizationName}
                addItem={addItem}
                updateQuantity={updateQuantity}
                updateCost={updateCost}
                updateItemMetadata={updateItemMetadata}
                removeItem={removeItem}
                onCreateProduct={(draft) => {
                  setProductForm({
                    ...emptyProductForm,
                    ...draft,
                  });
                  setShowNewProduct(true);
                }}
                onImport={() => setShowImportModal(true)}
              />
            }
          />
        </div>
      )}

      {/* ═══════ New Product Modal ═══════ */}
      {showNewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                Шинэ бараа бүртгэх
              </h2>
              <button
                onClick={() => {
                  setShowNewProduct(false);
                  setProductForm(emptyProductForm);
                  setProductError("");
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body - scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {productError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {productError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Барааны нэр <span className="text-red-500">*</span>
                </label>
                <input
                  value={productForm.name}
                  onChange={(e) =>
                    setProductForm({ ...productForm, name: e.target.value })
                  }
                  placeholder="Жишээ: Цагаан будаа 25кг"
                  className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Organization name + Register */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Байгууллагын нэр
                  </label>
                  <input
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Жишээ: Apu Dari"
                    className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Регистрийн дугаар
                  </label>
                  <input
                    value={productForm.orgRegister}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 7);
                      setProductForm({ ...productForm, orgRegister: val });
                    }}
                    placeholder="7 оронтой (жишээ: 1234567)"
                    maxLength={7}
                    className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* SKU Generator */}
              <SkuGenerator
                productName={productForm.name}
                organizationName={organizationName}
                warehouseId={selectedWarehouseId}
                value={productForm.sku}
                onChange={(sku) => setProductForm((prev) => ({ ...prev, sku }))}
              />

              {/* Barcode */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Баркод
                </label>
                <input
                  value={productForm.barcode}
                  onChange={(e) =>
                    setProductForm({ ...productForm, barcode: e.target.value })
                  }
                  placeholder="Баркод уншуулах эсвэл гараар оруулна уу"
                  className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Баркод эсвэл SKU кодын алийг нь ч уншуулж бараа хайж болно
                </p>
              </div>

              {/* Unit */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Хэмжих нэгж
                </label>
                <div className="relative">
                  <select
                    value={productForm.unit}
                    onChange={(e) =>
                      setProductForm({ ...productForm, unit: e.target.value })
                    }
                    className="h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">— Сонгох —</option>
                    <option value="ш">ш (ширхэг)</option>
                    <option value="кг">кг (килограмм)</option>
                    <option value="г">г (грамм)</option>
                    <option value="т">т (тонн)</option>
                    <option value="л">л (литр)</option>
                    <option value="мл">мл (миллилитр)</option>
                    <option value="м">м (метр)</option>
                    <option value="см">см (сантиметр)</option>
                    <option value="м²">м² (квадрат метр)</option>
                    <option value="м³">м³ (шоо метр)</option>
                    <option value="хайрцаг">хайрцаг</option>
                    <option value="уут">уут</option>
                    <option value="багц">багц</option>
                    <option value="дүүжин">дүүжин</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Тайлбар
                </label>
                <textarea
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Барааны дэлгэрэнгүй тайлбар (заавал биш)"
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Price: Авах үнэ (costPrice) first, then Зарах үнэ (price) */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Авах үнэ (₮)
                  </label>
                  <input
                    type="number"
                    value={productForm.costPrice}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        costPrice: e.target.value,
                      })
                    }
                    placeholder="0"
                    className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Зарах үнэ (₮) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={(e) =>
                      setProductForm({ ...productForm, price: e.target.value })
                    }
                    placeholder="0"
                    className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <WarehouseCategoryPicker
                value={productForm.businessCategoryId}
                onChange={(businessCategoryId) =>
                  setProductForm({ ...productForm, businessCategoryId })
                }
              />

              {/* Images */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <ImageIcon className="h-4 w-4" />
                  Зураг (хамгийн ихдээ 5)
                </label>

                <div className="flex flex-wrap gap-3">
                  {productForm.images.map((img, idx) => (
                    <div
                      key={idx}
                      className="group relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200"
                    >
                      <NextImage
                        src={img}
                        alt=""
                        fill
                        sizes="80px"
                        unoptimized
                        className="object-cover"
                      />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {productForm.images.length < 5 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-blue-400 hover:text-blue-500"
                    >
                      {uploadingImage ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-5 w-5" />
                          <span className="mt-1 text-[10px]">Нэмэх</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              {/* Inventory info */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
                <h3 className="text-sm font-bold text-slate-700">
                  Агуулахын мэдээлэл
                </h3>

                {/* Previous stock display (informational) */}
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-700">
                    Өмнөх үлдэгдэл
                  </span>
                  <span className="text-sm font-bold text-amber-800">0 ш</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Тоо ширхэг
                    </label>
                    <input
                      type="number"
                      value={productForm.quantity}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          quantity: e.target.value,
                        })
                      }
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Хамгийн бага
                    </label>
                    <input
                      type="number"
                      value={productForm.minQuantity}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          minQuantity: e.target.value,
                        })
                      }
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Байрлал
                    </label>
                    <input
                      value={productForm.location}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          location: e.target.value,
                        })
                      }
                      placeholder="A-1-3"
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Нэхэмжлэлийн дугаар
                    </label>
                    <input
                      value={productForm.batchNumber}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          batchNumber: e.target.value,
                        })
                      }
                      placeholder="INV-001"
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Дуусах хугацаа
                    </label>
                    <input
                      type="date"
                      value={productForm.expiryDate}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          expiryDate: e.target.value,
                        })
                      }
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Тэмдэглэл
                  </label>
                  <input
                    value={productForm.note}
                    onChange={(e) =>
                      setProductForm({ ...productForm, note: e.target.value })
                    }
                    placeholder="Нэмэлт тайлбар"
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => {
                  setShowNewProduct(false);
                  setProductForm(emptyProductForm);
                  setProductError("");
                }}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Болих
              </button>
              <button
                onClick={handleCreateProduct}
                disabled={
                  creatingProduct ||
                  !productForm.name.trim() ||
                  !productForm.price
                }
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingProduct && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <PackageCheck className="h-4 w-4" />
                Бараа үүсгэх
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {showImportModal && selectedWarehouseId && (
        <ExcelImportModal
          warehouseId={selectedWarehouseId}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            // Refresh search if there's an active search
            if (productSearch.trim()) {
              setProductSearch((prev) => prev); // trigger re-render
            }
          }}
        />
      )}
    </div>
  );
}
