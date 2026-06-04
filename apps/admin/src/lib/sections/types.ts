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
  | "survey"
  | "team"
  | "mgl-services"
  | "hr-services"
  | "franchise"
  | "projects";

export interface ServiceOption {
  id: string;
  name: string;
  price: number;
}

export interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  priceLabel?: string;
  fileUrl?: string;
  fileName?: string;
  hasForm?: boolean;
  formSlug?: string;
  formTitle?: string;
  features?: string[];
  options?: ServiceOption[];
}

export interface ServiceSubCategory {
  id: string;
  title: string;
  description?: string;
  items: ServiceItem[];
}

export interface ServiceCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  subCategories: ServiceSubCategory[];
}

export interface SurveySectionSettings {
  enabled: boolean;
  title: string;
  eyebrow: string;
  description: string;
  formSlug: string;
  formTitle?: string;
  actionLabel: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  details: string;
  price: number;
  imageUrl?: string;
  imageUrls?: string[];
  pdfUrl?: string;
  tags?: string[];
  isActive: boolean;
  isFeatured?: boolean;
  paymentAccountId?: string;
  paymentMerchantCode?: string;
}

export interface ProjectShowcaseSection {
  id: string;
  title: string;
  subtitle?: string;
  projectIds: string[];
}

export interface ProjectPaymentAccount {
  id: string;
  label?: string;
  merchantName?: string;
  merchantCode?: string;
  bankCode?: string;
  accountNumber?: string;
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
