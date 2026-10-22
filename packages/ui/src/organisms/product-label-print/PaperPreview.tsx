import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildLabelDocument } from "./document";
import {
  calculatePrintJob,
  type LabelPrintSettings,
  type ProductLabelValue,
} from "./layout";

export function PaperPreview({
  labels,
  settings,
}: {
  labels: ProductLabelValue[];
  settings: LabelPrintSettings;
}) {
  const [page, setPage] = useState(0);
  const [containerWidth, setContainerWidth] = useState(300);
  const container = useRef<HTMLDivElement>(null);
  const layout = useMemo(
    () => calculatePrintJob(settings, labels.length),
    [settings, labels.length],
  );
  const pageCount = Math.max(1, layout.pageCount);
  const currentPage = Math.min(page, pageCount - 1);
  const html = useMemo(
    () =>
      layout.fitsOnPage
        ? buildLabelDocument(
            layout.thermal
              ? labels
              : labels.slice(
                  currentPage * layout.labelsPerPage,
                  (currentPage + 1) * layout.labelsPerPage,
                ),
            settings,
          )
        : "",
    [
      labels,
      currentPage,
      layout.fitsOnPage,
      layout.labelsPerPage,
      layout.thermal,
      settings,
    ],
  );
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const widthPx = (layout.paperWidth * 96) / 25.4;
  const heightPx = (layout.documentHeight * 96) / 25.4;
  const scale = Math.min(1.4, Math.max(0.05, (containerWidth - 24) / widthPx));
  return (
    <section
      className="flex min-h-[320px] min-w-0 flex-col bg-slate-100 lg:min-h-0"
      aria-label="Сонгосон цаасны загвар"
    >
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <h4 className="text-sm font-black text-slate-950">Загвар</h4>
        <p className="mt-1 text-xs text-slate-500">
          {layout.thermal ? "Кассын цаас" : settings.paperPreset} ·{" "}
          {layout.paperWidth} × {layout.documentHeight} мм
          {layout.thermal && " · Доошоо цуваа"}
          {!layout.thermal &&
            ` · ${settings.orientation === "portrait" ? "Босоо" : "Хэвтээ"}`}
        </p>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div ref={container} className="w-full">
          {layout.fitsOnPage ? (
            <>
              <p className="mb-2 text-center text-[10px] font-semibold tabular-nums text-slate-500">
                ← {layout.paperWidth} мм →
              </p>
              <div
                className="relative mx-auto overflow-hidden bg-white shadow-lg ring-1 ring-slate-300"
                style={{ width: widthPx * scale, height: heightPx * scale }}
              >
                <iframe
                  title={
                    layout.thermal
                      ? "Бүх шошгоны цуваа рулон"
                      : `Хэвлэх хуудас ${currentPage + 1}`
                  }
                  srcDoc={html}
                  sandbox=""
                  tabIndex={-1}
                  className="pointer-events-none absolute left-0 top-0 border-0"
                  style={{
                    width: widthPx,
                    height: heightPx,
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                  }}
                />
                {!layout.thermal && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute border border-dashed border-sky-300"
                    style={{
                      inset: `${(settings.margin / layout.paperHeight) * 100}% ${(settings.margin / layout.paperWidth) * 100}%`,
                    }}
                  />
                )}
                {labels.length === 0 && (
                  <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-slate-400">
                    Бараа сонгоход шошго энд байрлана
                  </p>
                )}
              </div>
              <p className="mt-3 text-center text-[10px] text-slate-500">
                {layout.thermal ? "Нийт урт" : "Өндөр"} {layout.documentHeight}{" "}
                мм · Шошго {Number(layout.labelWidth.toFixed(1))} ×{" "}
                {Number(layout.labelHeight.toFixed(1))} мм
              </p>
            </>
          ) : (
            <p
              role="alert"
              className="rounded-lg border border-rose-200 bg-white p-5 text-sm text-rose-700"
            >
              Шошгоны хэмжээ эсвэл захыг багасгана уу.
            </p>
          )}
        </div>
      </div>
      {!layout.thermal ? (
        <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 bg-white p-3 text-xs text-slate-600">
          <button
            type="button"
            aria-label="Өмнөх хэвлэх хуудас"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
            className="rounded-lg border p-2 hover:bg-slate-50 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span aria-live="polite">
            Хуудас {currentPage + 1} / {pageCount}
          </span>
          <button
            type="button"
            aria-label="Дараах хэвлэх хуудас"
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage(currentPage + 1)}
            className="rounded-lg border p-2 hover:bg-slate-50 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </footer>
      ) : (
        <p
          role="status"
          className="shrink-0 border-t border-slate-200 bg-white p-3 text-center text-xs text-slate-600"
        >
          {labels.length} шошго · Нэг рулон · Доош гүйлгэж бүгдийг харна
        </p>
      )}
    </section>
  );
}
