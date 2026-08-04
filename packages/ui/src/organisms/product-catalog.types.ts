import type { ReactNode } from "react";

export type ProductCatalogViewMode = "list" | "grid";
export type ProductCatalogStatusTone =
  | "success"
  | "warning"
  | "danger"
  | "neutral";

export interface ProductCatalogItem {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  code?: string | null;
  barcode?: string | null;
  category?: string | null;
  price?: string | number | null;
  secondaryPrice?: string | number | null;
  stock?: string | number | null;
  expiry?: string | null;
  statusLabel?: string | null;
  statusTone?: ProductCatalogStatusTone;
  badge?: string | null;
}

export interface ProductCatalogLabels {
  name: string;
  code: string;
  category: string;
  price: string;
  stock: string;
  expiry: string;
  status: string;
}

export interface ProductCatalogItemsProps {
  items: ProductCatalogItem[];
  onItemClick?: (item: ProductCatalogItem) => void;
  renderActions?: (item: ProductCatalogItem) => ReactNode;
  disabledIds?: ReadonlySet<string>;
}

export interface ProductCatalogViewProps extends ProductCatalogItemsProps {
  view: ProductCatalogViewMode;
  onViewChange?: (view: ProductCatalogViewMode) => void;
  emptyState?: ReactNode;
  toolbar?: ReactNode;
  compact?: boolean;
  hideViewToggle?: boolean;
  listLabels?: Partial<ProductCatalogLabels>;
}
