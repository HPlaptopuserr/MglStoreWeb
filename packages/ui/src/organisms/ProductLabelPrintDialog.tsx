"use client";

import { Printer, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  calculatePrintJob,
  DEFAULT_PRINT_SETTINGS,
  clampQty,
  createDraft,
  draftLabelValue,
  type LabelPriceMode,
  type LabelPrintSettings,
  type ProductLabelDraft,
  type ProductLabelProduct,
} from "./product-label-print/layout";
import { printProductLabels } from "./product-label-print/document";
import { PrintSettingsBar } from "./product-label-print/PrintSettingsBar";
import { ProductPicker } from "./product-label-print/ProductPicker";
import { DraftQueue } from "./product-label-print/DraftQueue";
import { PaperPreview } from "./product-label-print/PaperPreview";
export type { ProductLabelProduct } from "./product-label-print/layout";
interface ProductLabelPrintDialogProps {
  open: boolean;
  products: ProductLabelProduct[];
  initialSearch?: string;
  onClose: () => void;
}

export function ProductLabelPrintDialog({
  open,
  products,
  initialSearch = "",
  onClose,
}: ProductLabelPrintDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  const [priceMode, setPriceMode] = useState<LabelPriceMode>("retail");
  const [printError, setPrintError] = useState("");
  const [drafts, setDrafts] = useState<ProductLabelDraft[]>([]);
  const [printSettings, setPrintSettings] = useState<LabelPrintSettings>(
    DEFAULT_PRINT_SETTINGS,
  );

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, select, textarea, [tabindex="0"]',
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === dialogRef.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === dialogRef.current)
      ) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open]);

  const labels = useMemo(
    () =>
      drafts.flatMap((draft) =>
        Array.from({ length: draft.qty }, () =>
          draftLabelValue(draft, priceMode),
        ),
      ),
    [drafts, priceMode],
  );
  const missingPrices = drafts.filter(
    (draft) => !draftLabelValue(draft, priceMode).priceText.trim(),
  ).length;

  const selectedLabelCount = labels.length;
  const printLayout = useMemo(
    () => calculatePrintJob(printSettings, selectedLabelCount),
    [printSettings, selectedLabelCount],
  );
  const pageCount = printLayout.pageCount;

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

  const updateDraft = (
    productId: string,
    updates: Partial<ProductLabelDraft>,
  ) => {
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
    setDrafts((current) =>
      current.filter((draft) => draft.productId !== productId),
    );
  };

  const handlePrint = () => {
    if (missingPrices) {
      setPrintError("Сонгосон үнийн дүнг бүх бараанд оруулна уу.");
      return;
    }
    if (!printLayout.fitsOnPage) {
      setPrintError("Шошгоны хэмжээ цаасны хэвлэх талбайгаас том байна.");
      return;
    }
    setPrintError(
      printProductLabels(labels, printSettings, setPrintError) ?? "",
    );
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
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-label-print-title"
        className="relative flex h-[92vh] max-h-[100dvh] w-full max-w-[1440px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-700">
              MGL
            </p>
            <h3
              id="product-label-print-title"
              className="text-xl font-black text-slate-950"
            >
              Үнэний шошго хэвлэх
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {selectedLabelCount} шошго ·{" "}
              {printLayout.thermal
                ? `${selectedLabelCount ? printLayout.documentHeight : 0} мм рулон`
                : `${pageCount} хуудас`}
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
              disabled={
                selectedLabelCount === 0 ||
                !printLayout.fitsOnPage ||
                missingPrices > 0
              }
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

        {printError && (
          <p
            role="alert"
            className="bg-rose-50 px-5 py-2 text-sm text-rose-700"
          >
            {printError}
          </p>
        )}
        <PrintSettingsBar
          settings={printSettings}
          layout={printLayout}
          priceMode={priceMode}
          onPriceModeChange={(mode) => {
            setPriceMode(mode);
            setPrintError("");
          }}
          onChange={(settings) => {
            setPrintSettings(settings);
            setPrintError("");
          }}
        />

        {missingPrices > 0 && (
          <p
            role="status"
            className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-sm text-amber-900"
          >
            {missingPrices} бараанд{" "}
            {priceMode === "wholesale" ? "бөөний" : "энгийн"} үнэ бүртгэлгүй
            байна. Үнийг оруулах эсвэл үнийн төрлөө солино уу.
          </p>
        )}
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(220px,1fr)_minmax(260px,1fr)_minmax(300px,1.1fr)] lg:overflow-hidden">
          <ProductPicker
            key={initialSearch}
            initialSearch={initialSearch}
            products={products}
            priceMode={priceMode}
            drafts={drafts}
            addProduct={addProduct}
          />
          <DraftQueue
            drafts={drafts}
            priceMode={priceMode}
            updateDraft={updateDraft}
            updateQty={updateQty}
            removeDraft={removeDraft}
          />
          <PaperPreview labels={labels} settings={printSettings} />
        </div>
      </div>
    </div>
  );
}

export {
  createDraft as buildProductLabelValue,
  calculatePrintLayout,
} from "./product-label-print/layout";
export type {
  LabelPrintSettings,
  ProductLabelValue,
} from "./product-label-print/layout";
export { renderProductLabelMarkup } from "./product-label-print/document";
