export type SectionKey =
  | "banner"
  | "categories"
  | "branches"
  | "cards"
  | "qr"
  | "pos"
  | "vendor-features"
  | "hr"
  | "forms"
  | "contract"
  | "projects";

export interface ProjectItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  details: string;
  price: number;
  imageUrl?: string;
  tags?: string[];
  isActive: boolean;
}

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
