export interface WarehouseDispatchDocument {
  id: string;
  dispatchNumber: string;
  storeName: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  reason: string | null;
  note: string | null;
  createdAt: string;
  createdByName: string;
  warehouse: { id: string; name: string; address: string };
  totalQuantity: number;
  totalAmount: string | null;
  items: Array<{
    id: string;
    productId: string;
    name: string;
    sku: string | null;
    quantity: number;
    unitPrice: string | null;
    totalAmount: string | null;
  }>;
}

export interface WarehouseDispatchHistory {
  items: WarehouseDispatchDocument[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
