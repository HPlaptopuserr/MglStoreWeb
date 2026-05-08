"use client";

import { SearchX } from "lucide-react";

export function OrganizationsEmptyState({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
        <SearchX size={28} className="text-gray-400" />
      </div>
      <h3 className="text-base font-bold text-gray-900">Илэрц олдсонгүй</h3>
      <p className="mt-1.5 max-w-xs text-sm text-gray-400">
        {searchQuery
          ? `"${searchQuery}" гэсэн хайлтад тохирох байгууллага байхгүй байна`
          : "Энэ ангилалд байгууллага бүртгэгдээгүй байна"}
      </p>
    </div>
  );
}
