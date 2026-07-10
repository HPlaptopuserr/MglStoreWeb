export interface ApiPartner {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  bannerUrl?: string;
  status: string;
  businessCategory?: string;
  address?: string | null;
  type?: string;
  isInvestor?: boolean;
  investorTier?: "TOP" | "STRATEGIC" | "INVESTOR" | null;
  investorLevel?: string | null;
  investmentAmount?: number | null;
}

export interface Investor {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  tier: "TOP" | "STRATEGIC" | "INVESTOR";
  tierLabel: string;
  featured: boolean;
  investmentLevel: string | null;
  investmentAmount?: number | null;
  description: string | null;
}

export interface OrganizationStore {
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
  categorySlugs: string[];
  address?: string | null;
  localAreaSlug?: string;
  localAreaLabel?: string;
  isInvestor?: boolean;
  investmentAmount?: number;
}

export interface PartnersPage {
  data: ApiPartner[];
  pagination: {
    total: number;
    totalPages: number;
  };
}
