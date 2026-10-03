import { Download, Loader2, PackageSearch } from "lucide-react";

export function CatalogWorkspaceHeader({
  total,
  query,
  loading,
  downloading,
  onDownload,
}: {
  total: number;
  query: string;
  loading: boolean;
  downloading: "excel" | "ai" | null;
  onDownload: (kind: "excel" | "ai") => void;
}) {
  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-blue-600">
            <PackageSearch aria-hidden="true" className="h-4 w-4" />
            БАРААНЫ УДИРДЛАГА
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Нэгдсэн барааны сан
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Бараагаа хайж, нэр болон мэдээллийг цэгцэлнэ. Дэлгүүрийн эзэн сонгож
            нэмэх үед энэ мэдээллийг ашиглана.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDownload("excel")}
          disabled={downloading !== null || loading}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50"
        >
          {downloading === "excel" ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Download aria-hidden="true" className="h-4 w-4" />
          )}
          Excel татах
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
        <p className="text-sm text-blue-950">
          Төв сангийн засвар дэлгүүрүүдийн одоо байгаа бараа, үнэ, үлдэгдлийг
          өөрчлөхгүй.
        </p>
        <span className="shrink-0 text-sm font-bold text-blue-700">
          {loading
            ? "Тооцоолж байна…"
            : `${total.toLocaleString("mn-MN")} ${query ? "үр дүн" : "бараа"}`}
        </span>
      </div>
    </header>
  );
}
