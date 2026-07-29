"use client";

import { Minus, PackageSearch, Plus, Printer, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ProductLabelDraft = {
  productId: string;
  name: string;
  code: string;
  priceText: string;
  qty: number;
};

type ProductLabelValue = Omit<ProductLabelDraft, "qty">;

export type ProductLabelProduct = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  price?: number | string | null;
};

type ProductLabelPrintDialogProps = {
  open: boolean;
  products: ProductLabelProduct[];
  initialSearch?: string;
  onClose: () => void;
};

const LABELS_PER_PAGE = 6;
const MAX_QTY = 999;
const CODE128_B_START = 104;
const CODE128_PATTERNS = [
  "212222",
  "222122",
  "222221",
  "121223",
  "121322",
  "131222",
  "122213",
  "122312",
  "132212",
  "221213",
  "221312",
  "231212",
  "112232",
  "122132",
  "122231",
  "113222",
  "123122",
  "123221",
  "223211",
  "221132",
  "221231",
  "213212",
  "223112",
  "312131",
  "311222",
  "321122",
  "321221",
  "312212",
  "322112",
  "322211",
  "212123",
  "212321",
  "232121",
  "111323",
  "131123",
  "131321",
  "112313",
  "132113",
  "132311",
  "211313",
  "231113",
  "231311",
  "112133",
  "112331",
  "132131",
  "113123",
  "113321",
  "133121",
  "313121",
  "211331",
  "231131",
  "213113",
  "213311",
  "213131",
  "311123",
  "311321",
  "331121",
  "312113",
  "312311",
  "332111",
  "314111",
  "221411",
  "431111",
  "111224",
  "111422",
  "121124",
  "121421",
  "141122",
  "141221",
  "112214",
  "112412",
  "122114",
  "122411",
  "142112",
  "142211",
  "241211",
  "221114",
  "413111",
  "241112",
  "134111",
  "111242",
  "121142",
  "121241",
  "114212",
  "124112",
  "124211",
  "411212",
  "421112",
  "421211",
  "212141",
  "214121",
  "412121",
  "111143",
  "111341",
  "131141",
  "114113",
  "114311",
  "411113",
  "411311",
  "113141",
  "114131",
  "311141",
  "411131",
  "211412",
  "211214",
  "211232",
  "2331112",
] as const;
const MGL_LABEL_LOGO_SVG = `
  <svg viewBox="0 0 125 41" role="img" aria-label="MGL" xmlns="http://www.w3.org/2000/svg">
    <path fill="#ffffff" d="M5.5 31.5V9.4c0-2 1.6-3.5 3.7-3.5h3.5c1.2 0 2.2.4 3 1.3l12.7 12.1L41.1 7.2c.9-.9 1.9-1.3 3.1-1.3h3.5c2.1 0 3.7 1.5 3.7 3.5v22.1h-9.2V18.9L31.5 29.2c-.9.9-1.9 1.3-3.1 1.3s-2.2-.4-3.1-1.3L14.7 18.9v12.6H5.5Z"/>
    <path fill="#ffffff" d="M73.1 32.4c-13.7 0-23.3-6.1-23.3-13.7S59.2 5 72.7 5c8.2 0 15.1 2.5 19.1 6.5l-7.1 4.4c-2.5-2.3-6.7-3.6-11.8-3.6-7.8 0-13.2 2.8-13.2 6.4 0 3.8 5.6 6.7 13.5 6.7 4.8 0 8.6-.9 11-2.6H72.3v-6.3h22.4v2.7c0 8-8.7 13.2-21.6 13.2Z"/>
    <path fill="#1b4dff" d="M66.8 18.8c5.7-3.2 12.6-4.6 21.2-4.2-3.7 2.8-8.2 5.1-13.4 6.8-3.1 1-6.7.1-7.8-2.6Z"/>
    <path fill="#ffffff" d="M94 31.5V6h9.9v18.4h21.1v7.1H94Z"/>
  </svg>
`;

export function ProductLabelPrintDialog({
  open,
  products,
  initialSearch = "",
  onClose,
}: ProductLabelPrintDialogProps) {
  const [labelSearch, setLabelSearch] = useState("");
  const [drafts, setDrafts] = useState<ProductLabelDraft[]>([]);

  useEffect(() => {
    if (!open) return;
    setLabelSearch(initialSearch.trim());
  }, [initialSearch, open]);

  const lowerSearch = labelSearch.trim().toLowerCase();
  const filteredProducts = useMemo(() => {
    if (!lowerSearch) return products;

    return products.filter((product) =>
      [product.name, product.sku, product.barcode, product.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(lowerSearch),
    );
  }, [lowerSearch, products]);

  const labels = useMemo(
    () =>
      drafts.flatMap((draft) =>
        Array.from({ length: draft.qty }, () => ({
          productId: draft.productId,
          name: draft.name,
          code: draft.code,
          priceText: draft.priceText,
        })),
      ),
    [drafts],
  );

  const selectedLabelCount = labels.length;
  const pageCount =
    selectedLabelCount === 0 ? 0 : Math.ceil(selectedLabelCount / LABELS_PER_PAGE);

  const addProduct = (product: ProductLabelProduct) => {
    setDrafts((current) => {
      const existing = current.find((draft) => draft.productId === product.id);
      if (existing) {
        return current.map((draft) =>
          draft.productId === product.id
            ? { ...draft, qty: clampQty(draft.qty + 1) }
            : draft,
        );
      }

      return [...current, createDraft(product)];
    });
  };

  const updateDraft = (productId: string, updates: Partial<ProductLabelDraft>) => {
    setDrafts((current) =>
      current.map((draft) =>
        draft.productId === productId ? { ...draft, ...updates } : draft,
      ),
    );
  };

  const updateQty = (productId: string, qty: number) => {
    updateDraft(productId, { qty: clampQty(qty) });
  };

  const removeDraft = (productId: string) => {
    setDrafts((current) => current.filter((draft) => draft.productId !== productId));
  };

  const handlePrint = () => {
    printProductLabels(labels);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Үнэний шошго хэвлэх цонх хаах"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-label-print-title"
        className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-700">
              MGL
            </p>
            <h3 id="product-label-print-title" className="text-xl font-black text-slate-950">
              Үнэний шошго хэвлэх
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {selectedLabelCount} шошго · {pageCount} хуудас
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setDrafts([])}
              disabled={drafts.length === 0}
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Цэвэрлэх
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={selectedLabelCount === 0}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#002b52] px-4 text-sm font-black text-white transition hover:bg-[#013765] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Printer size={16} />
              Хэвлэх
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Хаах"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px_340px]">
          <section className="flex min-h-0 flex-col border-r border-slate-200">
            <div className="shrink-0 border-b border-slate-100 p-4">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={labelSearch}
                  onChange={(event) => setLabelSearch(event.target.value)}
                  placeholder="Нэр, SKU, barcode"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {filteredProducts.length === 0 ? (
                <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center">
                  <div>
                    <PackageSearch className="mx-auto mb-3 h-9 w-9 text-slate-300" />
                    <p className="text-sm font-bold text-slate-700">Бараа олдсонгүй</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map((product) => {
                    const selectedQty =
                      drafts.find((draft) => draft.productId === product.id)?.qty ?? 0;

                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addProduct(product)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-sky-300 hover:bg-sky-50"
                      >
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-sm font-black text-slate-950">
                            {product.name}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                            Barcode {product.barcode || "-"} · {formatLabelPrice(product.price)}
                          </p>
                        </div>
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            selectedQty > 0
                              ? "bg-sky-600 text-white"
                              : "bg-slate-950 text-white"
                          }`}
                        >
                          {selectedQty > 0 ? selectedQty : <Plus size={16} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="flex min-h-0 flex-col border-r border-slate-200">
            <div className="shrink-0 border-b border-slate-100 px-4 py-3">
              <h4 className="text-sm font-black text-slate-950">Хэвлэх мөр</h4>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {drafts.length === 0 ? (
                <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center">
                  <p className="text-sm font-bold text-slate-500">Сонгосон бараа байхгүй</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {drafts.map((draft) => (
                    <div key={draft.productId} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-sm font-black text-slate-950">
                            {draft.name}
                          </p>
                          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                            {draft.qty} шошго
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDraft(draft.productId)}
                          aria-label={`${draft.name} мөр устгах`}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <LabelInput
                          label="Нэр"
                          value={draft.name}
                          onChange={(value) => updateDraft(draft.productId, { name: value })}
                          className="col-span-2"
                        />
                        <LabelInput
                          label="Код"
                          value={draft.code}
                          onChange={(value) => updateDraft(draft.productId, { code: value })}
                        />
                        <LabelInput
                          label="Үнэ"
                          value={draft.priceText}
                          onChange={(value) => updateDraft(draft.productId, { priceText: value })}
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-2 py-2">
                        <span className="text-xs font-bold text-slate-500">Тоо</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateQty(draft.productId, draft.qty - 1)}
                            aria-label={`${draft.name} тоо бууруулах`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            value={draft.qty}
                            onChange={(event) => updateQty(draft.productId, Number(event.target.value))}
                            inputMode="numeric"
                            className="h-8 w-14 rounded-lg border border-slate-200 bg-white text-center text-sm font-black tabular-nums text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                            aria-label={`${draft.name} хэвлэх тоо`}
                          />
                          <button
                            type="button"
                            onClick={() => updateQty(draft.productId, draft.qty + 1)}
                            aria-label={`${draft.name} тоо нэмэх`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="flex min-h-0 flex-col bg-slate-50">
            <div className="shrink-0 border-b border-slate-200 px-4 py-3">
              <h4 className="text-sm font-black text-slate-950">Загвар</h4>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {labels.length === 0 ? (
                <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-center">
                  <p className="text-sm font-bold text-slate-500">Сонгосон шошго байхгүй</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1">
                  {labels.map((label, index) => (
                    <LabelPreviewCard
                      key={`${label.productId}-${index}`}
                      label={label}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function LabelInput({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
      />
    </label>
  );
}

function LabelPreviewCard({ label }: { label: ProductLabelValue | null }) {
  return (
    <div className="overflow-hidden rounded-[3px] border border-[#002b52] bg-white shadow-sm">
      <div className="flex h-7 items-center bg-[#002b52] px-2">
        <MglLabelLogo className="h-4 w-[50px]" />
      </div>
      <div className="p-1.5 text-[#002b52]">
        <p className="text-[8px] font-black leading-none">БҮТЭЭГДЭХҮҮНИЙ НЭР:</p>
        <div className="mt-1 flex h-5 items-center justify-center rounded-[4px] border-2 border-[#002b52] px-1">
          <span className="line-clamp-1 text-[10px] font-black text-slate-900">
            {label?.name ?? ""}
          </span>
        </div>
        <div className="mt-1 grid grid-cols-2 gap-1 text-[8px] font-black leading-none">
          <span>КОД:</span>
          <span>ҮНЭ:</span>
        </div>
        <div className="mt-1 grid grid-cols-2 gap-1">
          <div className="flex h-6 items-center justify-center rounded-[4px] border-2 border-[#002b52] px-1">
            {label?.code ? <BarcodePreview value={label.code} /> : null}
          </div>
          <div className="flex h-6 items-center justify-center rounded-[4px] border-2 border-[#002b52] px-1">
            <span className="truncate text-[10px] font-black text-slate-900">
              {label?.priceText ?? ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BarcodePreview({ value }: { value: string }) {
  const barcode = createCode128Barcode(value);
  if (!barcode) {
    return <span className="truncate text-[8px] font-black text-slate-900">{value}</span>;
  }

  return (
    <div className="flex w-full flex-col items-center justify-center">
      <svg
        viewBox={`0 0 ${barcode.width} 50`}
        preserveAspectRatio="none"
        aria-label={`Barcode ${value}`}
        role="img"
        className="h-2.5 w-full"
      >
        {barcode.bars.map((bar, index) => (
          <rect key={`${bar.x}-${index}`} x={bar.x} y="0" width={bar.width} height="50" fill="#111111" />
        ))}
      </svg>
      <span className="mt-0.5 max-w-full truncate text-[7px] font-black leading-none text-slate-900">
        {value}
      </span>
    </div>
  );
}

function MglLabelLogo({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 125 41"
      aria-label="MGL"
      role="img"
      className={className}
    >
      <path
        fill="#ffffff"
        d="M5.5 31.5V9.4c0-2 1.6-3.5 3.7-3.5h3.5c1.2 0 2.2.4 3 1.3l12.7 12.1L41.1 7.2c.9-.9 1.9-1.3 3.1-1.3h3.5c2.1 0 3.7 1.5 3.7 3.5v22.1h-9.2V18.9L31.5 29.2c-.9.9-1.9 1.3-3.1 1.3s-2.2-.4-3.1-1.3L14.7 18.9v12.6H5.5Z"
      />
      <path
        fill="#ffffff"
        d="M73.1 32.4c-13.7 0-23.3-6.1-23.3-13.7S59.2 5 72.7 5c8.2 0 15.1 2.5 19.1 6.5l-7.1 4.4c-2.5-2.3-6.7-3.6-11.8-3.6-7.8 0-13.2 2.8-13.2 6.4 0 3.8 5.6 6.7 13.5 6.7 4.8 0 8.6-.9 11-2.6H72.3v-6.3h22.4v2.7c0 8-8.7 13.2-21.6 13.2Z"
      />
      <path
        fill="#1b4dff"
        d="M66.8 18.8c5.7-3.2 12.6-4.6 21.2-4.2-3.7 2.8-8.2 5.1-13.4 6.8-3.1 1-6.7.1-7.8-2.6Z"
      />
      <path
        fill="#ffffff"
        d="M94 31.5V6h9.9v18.4h21.1v7.1H94Z"
      />
    </svg>
  );
}

function createDraft(product: ProductLabelProduct): ProductLabelDraft {
  return {
    productId: product.id,
    name: product.name,
    code: product.barcode || "",
    priceText: formatLabelPrice(product.price),
    qty: 1,
  };
}

function clampQty(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(MAX_QTY, Math.floor(value)));
}

function formatLabelPrice(value: number | string | null | undefined) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0₮";
  return `${Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(1)}₮`;
}

function printProductLabels(labels: ProductLabelValue[]) {
  if (typeof window === "undefined" || labels.length === 0) return;

  const popup = window.open("", "_blank", "width=1120,height=780");
  if (!popup) {
    window.alert("Хэвлэх цонх нээгдсэнгүй. Browser popup тохиргоогоо шалгана уу.");
    return;
  }

  const pages = chunkLabels(labels, LABELS_PER_PAGE);
  const pageMarkup = pages.map((page) => renderPrintPage(page)).join("");

  popup.document.write(`
    <html>
      <head>
        <title>MGL price labels</title>
        <style>
          @page { size: A4 landscape; margin: 4mm; }
          * { box-sizing: border-box; }
          html {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          body {
            margin: 0;
            background: #f1f5f9;
            color: #002b52;
            font-family: Arial, Helvetica, sans-serif;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .sheet {
            width: 289mm;
            height: 202mm;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            grid-template-rows: repeat(3, minmax(0, 1fr));
            gap: 0;
            margin: 0 auto;
            background: #ffffff;
            page-break-after: always;
          }
          .sheet:last-child { page-break-after: auto; }
          .label {
            min-width: 0;
            min-height: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 0.18mm solid #c9d1dc;
            background: #ffffff;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .brand {
            height: 13.5mm;
            display: flex;
            align-items: center;
            padding: 0 6mm;
            background: #002b52;
            background-color: #002b52;
            box-shadow: inset 0 0 0 1000px #002b52;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .logo {
            display: block;
            width: 31mm;
            height: auto;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .logo svg {
            display: block;
            width: 31mm;
            height: auto;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .body {
            display: flex;
            min-height: 0;
            flex: 1;
            flex-direction: column;
            padding: 1.5mm 2.8mm 2.4mm;
            color: #002b52;
          }
          .field-title {
            font-family: Georgia, "Times New Roman", serif;
            font-size: 5mm;
            font-weight: 900;
            line-height: 1;
            letter-spacing: 0.18mm;
          }
          .name-box,
          .small-box {
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1.35mm solid #002b52;
            border-radius: 3mm;
            color: #1a1a1a;
            overflow: hidden;
          }
          .name-box {
            height: 9.5mm;
            margin-top: 1.1mm;
            padding: 0 2mm;
          }
          .name-value {
            max-width: 100%;
            overflow: hidden;
            text-align: center;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 4.6mm;
            font-weight: 900;
            line-height: 1;
          }
          .split-title {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: 6mm;
            margin-top: 1.5mm;
          }
          .small-boxes {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: 6mm;
            margin-top: 1.1mm;
          }
          .small-box {
            height: 14.5mm;
            padding: 0 2mm;
          }
          .barcode-box {
            flex-direction: column;
            gap: 0.9mm;
          }
          .barcode-svg {
            display: block;
            width: 100%;
            height: 7.3mm;
          }
          .barcode-svg rect {
            fill: #111111;
          }
          .barcode-text {
            display: block;
            max-width: 100%;
            overflow: hidden;
            color: #111111;
            font-size: 3.1mm;
            font-weight: 900;
            line-height: 1;
            text-align: center;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .code-value,
          .price-value {
            max-width: 100%;
            overflow: hidden;
            text-align: center;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-weight: 900;
            line-height: 1;
          }
          .code-value { font-size: 3.6mm; }
          .price-value { font-size: 4.6mm; }
          .label.empty .name-value,
          .label.empty .code-value,
          .label.empty .price-value { color: transparent; }
          @media print {
            body { background: #ffffff; }
            .sheet { margin: 0; }
            .brand {
              background: #002b52 !important;
              background-color: #002b52 !important;
              box-shadow: inset 0 0 0 1000px #002b52 !important;
            }
            .logo svg,
            .logo path {
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
            }
            .barcode-svg rect { fill: #111111 !important; }
          }
        </style>
      </head>
      <body>
        ${pageMarkup}
        <script>
          window.onload = function () {
            window.print();
            setTimeout(function () { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `);
  popup.document.close();
}

function chunkLabels(labels: ProductLabelValue[], size: number) {
  const chunks: ProductLabelValue[][] = [];
  for (let index = 0; index < labels.length; index += size) {
    chunks.push(labels.slice(index, index + size));
  }
  return chunks;
}

function renderPrintPage(pageLabels: ProductLabelValue[]) {
  return `
    <section class="sheet">
      ${pageLabels.map((label) => renderPrintLabel(label)).join("")}
    </section>
  `;
}

function renderPrintLabel(label: ProductLabelValue | null) {
  const isEmpty = !label;

  return `
    <article class="label${isEmpty ? " empty" : ""}">
      <div class="brand"><div class="logo">${MGL_LABEL_LOGO_SVG}</div></div>
      <div class="body">
        <div class="field-title">БҮТЭЭГДЭХҮҮНИЙ НЭР:</div>
        <div class="name-box">
          <span class="name-value">${escapeHtml(label?.name ?? "")}</span>
        </div>
        <div class="split-title">
          <div class="field-title">КОД:</div>
          <div class="field-title">ҮНЭ:</div>
        </div>
        <div class="small-boxes">
          <div class="small-box barcode-box">${renderBarcodeMarkup(label?.code ?? "")}</div>
          <div class="small-box"><span class="price-value">${escapeHtml(label?.priceText ?? "")}</span></div>
        </div>
      </div>
    </article>
  `;
}

function renderBarcodeMarkup(value: string) {
  const normalized = value.trim();
  if (!normalized) return "";

  const barcode = createCode128Barcode(normalized);
  if (!barcode) {
    return `<span class="code-value">${escapeHtml(normalized)}</span>`;
  }

  const rects = barcode.bars
    .map((bar) => `<rect x="${bar.x}" y="0" width="${bar.width}" height="50"></rect>`)
    .join("");

  return `
    <svg class="barcode-svg" viewBox="0 0 ${barcode.width} 50" preserveAspectRatio="none" role="img" aria-label="Barcode ${escapeHtml(normalized)}">
      ${rects}
    </svg>
    <span class="barcode-text">${escapeHtml(normalized)}</span>
  `;
}

function createCode128Barcode(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;

  const values: number[] = [CODE128_B_START];
  for (const char of normalized) {
    const code = char.charCodeAt(0);
    if (code < 32 || code > 127) return null;
    values.push(code - 32);
  }

  const checksum =
    values.reduce((sum, value, index) => (index === 0 ? value : sum + value * index), 0) % 103;
  values.push(checksum, 106);

  const quietZone = 10;
  const bars: Array<{ x: number; width: number }> = [];
  let x = quietZone;

  values.forEach((codeValue) => {
    const pattern = CODE128_PATTERNS[codeValue];
    if (!pattern) return;

    Array.from(pattern).forEach((moduleWidth, index) => {
      const width = Number(moduleWidth);
      if (index % 2 === 0) {
        bars.push({ x, width });
      }
      x += width;
    });
  });

  return { bars, width: x + quietZone };
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
