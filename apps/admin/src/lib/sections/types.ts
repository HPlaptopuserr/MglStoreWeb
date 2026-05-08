export type SectionKey = "banner" | "categories" | "branches" | "cards" | "qr" | "pos" | "vendor-features" | "hr" | "forms" | "contract" | "team";

export type CardPartner = {
  id: string;
  name: string;
  slug: string;
  type?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  businessCategory?: string | null;
  phone?: string | null;
  address?: string | null;
};

export type BranchMapItem = {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  organizationId: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  createdAt?: string;
};

export type BranchFormState = {
  name: string;
  address: string;
  lat: string;
  lng: string;
};
