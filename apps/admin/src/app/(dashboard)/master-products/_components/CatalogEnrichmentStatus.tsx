import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import type { EnrichmentProgress } from "./useCatalogEnrichment";

interface Props {
  progress: EnrichmentProgress | null;
  running: boolean;
  completed: boolean;
  error: string;
  onRetry: () => void;
}
export function CatalogEnrichmentStatus({
  progress,
  running,
  completed,
  error,
  onRetry,
}: Props) {
  if (!progress) return null;
  const percent = progress.total
    ? Math.min(100, Math.round((progress.processed / progress.total) * 100))
    : completed
      ? 100
      : 0;
  return (
    <section
      aria-label="Сан шинэчлэх явц"
      className="space-y-4 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-5"
    >
      <div
        className="flex items-center gap-2 text-sm font-bold text-slate-900"
        role="status"
      >
        {running ? (
          <Loader2 aria-hidden className="h-5 w-5 animate-spin text-blue-600" />
        ) : completed ? (
          <CheckCircle2 aria-hidden className="h-5 w-5 text-emerald-600" />
        ) : (
          <AlertTriangle aria-hidden className="h-5 w-5 text-amber-600" />
        )}
        {running
          ? "Vendor болон агуулахын санг тулгаж байна…"
          : completed
            ? "Сан шинэчлэгдлээ"
            : "Тулгалт тасалдсан"}
      </div>
      <p className="text-sm text-slate-500">
        {progress.processed.toLocaleString()} /{" "}
        {progress.total.toLocaleString()} бараа шалгасан. Үүнээс{" "}
        {progress.warehouseProducts.toLocaleString()} нь агуулахад бүртгэлтэй.
      </p>
      <progress
        aria-label="Тулгалтын явц"
        value={percent}
        max={100}
        className="h-2 w-full accent-blue-600"
      />
      <div className="grid grid-cols-3 gap-3">
        {[
          ["Шинээр нэмсэн", progress.created],
          ["Санд бүртгэлтэй", progress.existing],
          ["Шалгах шаардлагатай", progress.skipped],
        ].map(([label, count]) => (
          <div key={label} className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {Number(count).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
      {running && (
        <p className="text-xs text-slate-500">
          Тулгалт дуусах хүртэл энэ хуудсыг нээлттэй байлгана уу.
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800"
        >
          <p>{error}</p>
          <p className="mt-1">
            Дууссан хэсгүүд хадгалагдсан. Дахин эхлүүлэхэд бүх санг дахин
            тулгана.
          </p>
          <button
            type="button"
            onClick={onRetry}
            disabled={running}
            className="mt-2 rounded-lg border border-rose-200 px-3 py-2 font-semibold hover:bg-rose-100 focus-visible:outline-blue-600 disabled:opacity-50"
          >
            Дахин тулгах
          </button>
        </div>
      )}
      {progress.issues.length > 0 && (
        <details className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-amber-900">
            Шалгах бараа ({progress.skipped})
          </summary>
          <p className="mt-2 text-xs text-amber-800">
            Эхний {progress.issues.length} бүртгэл. Эдгээрийг автоматаар
            нэгтгээгүй.
          </p>
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {progress.issues.map((issue) => (
              <li
                key={issue.productId}
                className="rounded-lg bg-white p-3 text-sm"
              >
                <p className="font-semibold text-slate-900">{issue.name}</p>
                <p className="text-slate-500">{issue.reason}</p>
                <p className="mt-1 break-all font-mono text-xs text-slate-400">
                  {issue.productId}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
