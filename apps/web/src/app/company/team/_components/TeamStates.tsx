import { Users } from "lucide-react";

export function SkeletonCard() {
  return (
    <div className="min-h-[360px] overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-sm">
      <div className="relative h-32 overflow-hidden bg-slate-100">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-100 via-white to-slate-100" />
      </div>
      <div className="px-6 pb-6 pt-11">
        <div className="h-5 w-1/2 rounded-full bg-slate-100" />
        <div className="mt-2 h-3 w-1/3 rounded-full bg-slate-100" />
        <div className="my-4 h-px bg-slate-100" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded-full bg-slate-100" />
          <div className="h-3 w-5/6 rounded-full bg-slate-100" />
          <div className="h-3 w-2/3 rounded-full bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <Users size={28} className="text-slate-300" />
      </div>
      <div>
        <p className="text-lg font-black text-slate-700">
          {hasFilters ? "Илэрц олдсонгүй" : "Гишүүдийн мэдээлэл удахгүй нэмэгдэнэ"}
        </p>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-400">
          {hasFilters
            ? "Хэлтэс эсвэл хайлтын утгаа өөрчлөөд дахин шалгаарай."
            : "Багийн мэдээлэл нэмэгдмэгц энд харагдана."}
        </p>
      </div>
    </div>
  );
}
