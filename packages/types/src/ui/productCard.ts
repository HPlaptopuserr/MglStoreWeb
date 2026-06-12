import type { ID } from "../primitives";

export interface ProductCardProps {
  id?: ID;
  href?: string;
  image?: string;
  images?: string[]; // Multiple images support (2-3 images)
  name: string;
  price: number;

  originalPrice?: number;
  memberDiscountLabel?: string | null;
  category?: string;
  tag?: string;

  rating?: number;
  reviews?: number;
  stock?: number;
  isPreorder?: boolean;
  preorderLeadTimeDays?: number | null;

  storeName?: string;

  colorCount?: number;
  tags?: string[];
  isPrime?: boolean;
  wishlistActive?: boolean;
  showCartAction?: boolean;
  onWishlistToggle?: (active: boolean) => void;
  onAddToCart?: () => void;
}
