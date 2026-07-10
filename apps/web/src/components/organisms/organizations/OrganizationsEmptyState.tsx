"use client";

import { SearchX } from "lucide-react";

export function OrganizationsEmptyState({ searchQuery, isLocalMode = false }: { searchQuery: string; isLocalMode?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-5 py-20 text-center shadow-sm">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 ring-8 ring-blue-50/60">
        <SearchX size={28} className="text-blue-600" />
      </div>
      <h3 className="text-lg font-black text-slate-950">Илэрц олдсонгүй</h3>
      <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-slate-500">
        {searchQuery
          ? `"${searchQuery}" гэсэн хайлтад тохирох байгууллага байхгүй байна`
          : isLocalMode
            ? "Сонгосон аймаг, ангилалд бүртгэлтэй байгууллага одоогоор алга байна"
            : "Энэ ангилалд байгууллага бүртгэгдээгүй байна"}
      </p>
    </div>
  );
}
