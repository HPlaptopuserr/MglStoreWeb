export interface BusinessCategory {
  id: string;
  slug: string;
  name: string;
  icon?: string | null;
  parentId?: string | null;
  level?: number;
  productCount?: number;
  directProductCount?: number;
  _count?: { products?: number };
}
