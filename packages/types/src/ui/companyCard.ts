import type { ID } from "../primitives";

export interface ProductCardItem {
  id: ID;
  title: string;
  price: number;

  originalPrice?: number;
  image: string;

  category?: string;

  tag?: string;

  tags?: string[];

  rating?: number;
  reviewCount?: number;
  soldCount?: number;
  reviews?: number;
  stock?: number;

  colorCount?: number;
  isPrime?: boolean;
}

export interface CompanyCard {
  id: ID;
  name: string;
  slug: string;

  logo: string;
  banner: string;
  description?: string;

  distance?: string;
  deliveryTime?: string;
  address?: string;
  openingHours?: string;
  isOpen?: boolean;
  rating?: number;
  reviewCount?: number;
  soldCount?: number;

  category?: string;
  categories?: string[];

  products: ProductCardItem[];

  isInvestor?: boolean;
  investmentAmount?: number;
}
