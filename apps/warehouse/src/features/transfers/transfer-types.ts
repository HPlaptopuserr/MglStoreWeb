export interface WarehouseOption {
  id: string;
  name: string;
}
export interface TransferProduct {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  barcodeAliases?: string[];
  price?: number | string;
  isActive?: boolean;
}
export interface TransferStock {
  id: string;
  quantity: number;
  product: TransferProduct;
}
export interface SendItem {
  productId: string;
  quantity: number;
  name: string;
  available: number;
}
export interface TransferLine {
  unitCost: string | number | null;
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  salePrice: string | number | null;
  targetProductId: string | null;
  matches?: TransferProduct[];
}
export interface TransferDocument {
  id: string;
  status: "SENT" | "RECEIVED";
  sourceWarehouse: WarehouseOption;
  destinationWarehouse: WarehouseOption;
  sentAt: string;
  note: string | null;
  items: TransferLine[];
}
export interface AcceptanceLine {
  confirmed: boolean;
  id: string;
  quantity: string;
  salePrice: string;
  targetProductId: string;
}
