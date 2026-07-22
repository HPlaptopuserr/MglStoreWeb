"use client";

import { OrganizationCard } from "./OrganizationCard";
import type { OrganizationStore } from "@/features/organizations/types";

interface OrganizationsGridProps {
  stores: OrganizationStore[];
}

export function OrganizationsGrid({ stores }: OrganizationsGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stores.map((company) => (
        <OrganizationCard key={company.id} company={company} />
      ))}
    </div>
  );
}
