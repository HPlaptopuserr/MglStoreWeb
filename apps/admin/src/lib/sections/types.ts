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
  | "study"
  | "franchise"
  | "projects";

export interface ServiceOption {
  id: string;
  name: string;
  price: number;
}

export interface ServicePartner {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  slug?: string;
  website?: string;
}

export interface ServiceImage {
  id: string;
  url: string;
  caption?: string;
}

export interface ServicePerson {
  id: string;
  userId?: string;
  name: string;
  role?: string;
  bio?: string;
  detail?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  imageUrl?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  priceLabel?: string;
  imageUrl?: string;
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
  introTitle?: string;
  introDescription?: string;
  bodyTitle?: string;
  bodyText?: string;
  images?: ServiceImage[];
  people?: ServicePerson[];
  partners?: ServicePartner[];
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
  teacherInfo?: string;
  duration?: string;
  capacity?: string;
  courseDate?: string;
  courseTime?: string;
  deliveryType?: string;
  location?: string;
  address?: string;
  registrationLabel?: string;
  scheduleNote?: string;
  priceNote?: string;
  originalPrice?: number;
  tags?: string[];
  isActive: boolean;
  isFeatured?: boolean;
  featuredOrder?: number;
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

export interface StudySectionSettings {
  eyebrow: string;
  title: string;
  accentTitle: string;
  description: string;
  countLabel: string;
  secondaryPillLabel: string;
  listEyebrow: string;
  listTitle: string;
  emptyText: string;
  bannerUrl: string;
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
