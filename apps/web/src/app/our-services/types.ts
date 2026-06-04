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
