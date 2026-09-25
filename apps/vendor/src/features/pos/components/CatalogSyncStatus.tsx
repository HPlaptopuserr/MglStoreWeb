import { CloudCheck, Loader2, WifiOff } from "lucide-react";

interface CatalogSyncStatusProps {
  count: number;
  hasSnapshot: boolean;
  refreshing: boolean;
  updatedAt: number | null;
  error: string | null;
}

export function CatalogSyncStatus({
  count,
  hasSnapshot,
  refreshing,
  updatedAt,
  error,
}: CatalogSyncStatusProps) {
  if (!hasSnapshot) return null;
  const Icon = error ? WifiOff : refreshing ? Loader2 : CloudCheck;
  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${error ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-slate-50 text-slate-600"}`}
    >
      <Icon
        aria-hidden="true"
        className={`mt-0.5 h-4 w-4 shrink-0 ${refreshing ? "animate-spin" : ""}`}
      />
      <div>
        <p className="font-semibold">
          {refreshing
            ? "Барааны мэдээлэл шинэчилж байна…"
            : `${count.toLocaleString("mn-MN")} барааны бүрэн жагсаалт`}
        </p>
        <p className="mt-0.5 leading-5">
          {error
            ? `${error} Хадгалсан жагсаалтыг харуулж байна; үнэ, үлдэгдэл шинэчлэгдээгүй байж болно. `
            : "Идэвхтэй, бэлэн бараанууд. "}
          {updatedAt
            ? `Шинэчилсэн: ${new Date(updatedAt).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" })}`
            : ""}
        </p>
      </div>
    </div>
  );
}
