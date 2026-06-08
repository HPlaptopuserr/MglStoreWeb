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
