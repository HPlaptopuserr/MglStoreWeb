export type WarehouseCategory = {
  id: string;
  name: string;
  slug?: string;
  icon?: string | null;
  level: number;
  parentId: string | null;
  productCount?: number;
  directProductCount?: number;
  _count?: { products: number };
};

export type CategoryLevel = 0 | 1 | 2;

export type CreateWarehouseCategoryInput = {
  name: string;
  level: CategoryLevel;
  parentId: string | null;
};
