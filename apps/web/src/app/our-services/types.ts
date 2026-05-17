export interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  priceLabel?: string;
  features?: string[];
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
