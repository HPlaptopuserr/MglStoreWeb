"use client";

import { Building2 } from "lucide-react";

export function OrganizationsEmptyState({
  searchQuery,
}: {
  searchQuery: string;
}) {
  return (
    <div className="text-center py-24">
      <Building2 className="mx-auto mb-4 text-gray-300" size={40} />
      <h3 className="text-lg font-bold">Илэрц олдсонгүй</h3>
      <p className="text-sm text-gray-400">
        “{searchQuery}” хайлтад тохирох байгууллага алга
      </p>
    </div>
  );
}