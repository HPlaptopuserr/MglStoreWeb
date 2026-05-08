"use client";

import { OrganizationCard } from "./OrganizationCard";

interface StoreItem {
  id: string;
  name: string;
  slug: string;
  logo: string;
  banner: string;
  isOpen: boolean;
  category: string;
  rating: number;
  deliveryTime: string;
  products: string[];
  isInvestor?: boolean;
  investmentAmount?: number;
}

interface OrganizationsGridProps {
  stores: StoreItem[];
}

export function OrganizationsGrid({ stores }: OrganizationsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {stores.map((company) => (
        <OrganizationCard key={company.id} company={company} />
      ))}
    </div>
  );
}
