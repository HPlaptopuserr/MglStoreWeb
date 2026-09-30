import Link from "next/link";
import { Loader2 } from "lucide-react";
export function CatalogManagementTools({
  unlinked,
  syncing,
  downloading,
  onSync,
  onDownload,
}: {
  unlinked: number;
  syncing: boolean;
  downloading: boolean;
  onSync: () => void;
  onDownload: () => void;
}) {
  const button =
    "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50";
  return (
    <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600">
        Нэмэлт удирдлага{" "}
        <span className="ml-2 text-xs font-normal text-slate-400">
          Холболт, онлайн суваг, өгөгдөл татах
        </span>
      </summary>
      <div className="grid gap-5 border-t border-slate-100 p-4 lg:grid-cols-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Төв сантай холбох
          </h2>
          <p className="mb-3 mt-1 text-xs leading-5 text-slate-500">
            {unlinked.toLocaleString("mn-MN")} бараа холбоогүй. Энэ үйлдэл нэг
            удаад 500 хүртэл барааны төв сангийн холбоосыг шинэчилнэ. Нэр, үнэ,
            үлдэгдлийг засахгүй.
          </p>
          <button
            type="button"
            onClick={onSync}
            disabled={syncing || unlinked === 0}
            className={button}
          >
            {syncing && (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            )}
            {syncing ? "Холбож байна…" : "Барааны холбоос үүсгэх"}
          </button>
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Онлайн худалдааны суваг
          </h2>
          <p className="mb-3 mt-1 text-xs leading-5 text-slate-500">
            Нэгдсэн сангийн бараа сайтад автоматаар нийтлэгдэхгүй. Байгууллагын
            онлайн сувгийг тусад нь тохируулна.
          </p>
          <Link href="/sections/vendor-features" className={button}>
            Сувгийн тохиргоо →
          </Link>
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">Өгөгдөл татах</h2>
          <p className="mb-3 mt-1 text-xs leading-5 text-slate-500">
            Одоогийн хайлтад тохирсон барааны мэдээллийг боловсруулалт,
            шинжилгээнд зориулж JSON файлаар татна.
          </p>
          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            className={button}
          >
            {downloading ? "Бэлтгэж байна…" : "JSON татах"}
          </button>
        </div>
      </div>
    </details>
  );
}
