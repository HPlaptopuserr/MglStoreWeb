import type { MemberDiscount } from "@/lib/member-pricing";

export interface CarouselProduct {
  id: string;
  name: string;
  price: number;
  stock?: number | null;
  images?: Array<{ url: string }>;
  discounts?: MemberDiscount[] | null;
  businessCategory?: { name?: string | null } | null;
  organization?: { name?: string | null } | null;
  supplyType?: string | null;
  preorderLeadTimeDays?: number | null;
}
