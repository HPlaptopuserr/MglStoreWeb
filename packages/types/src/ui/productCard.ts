import type { ID } from "../primitives";

export interface ProductCardProps {
  id?: ID;
  image: string;
  images?: string[]; // Multiple images support (2-3 images)
  name: string;
  price: number;

  originalPrice?: number;
  category?: string;
  tag?: string;

  rating?: number;
  reviews?: number;
  stock?: number;

  storeName?: string;

  colorCount?: number;
  tags?: string[];
  isPrime?: boolean;
}
