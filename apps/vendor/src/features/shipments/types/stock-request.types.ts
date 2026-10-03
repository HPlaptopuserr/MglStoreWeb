export type StockRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PROCESSING"
  | "COMPLETED"
  | "CANCELLED";

export type StockPaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "CANCELLED";

export type StockRequestPayment = {
  id: string;
  invoiceNumber: string;
  totalAmount: string;
  paidAmount: string;
  status: StockPaymentStatus;
  paidAt: string | null;
  dueDate: string | null;
  createdAt: string;
  request?: {
    id: string;
    requestNumber: string;
    status: StockRequestStatus;
    warehouse?: {
      id: string;
      name: string;
    };
    items?: {
      id: string;
      quantity: number;
      approvedQuantity: number | null;
      product: {
        id: string;
        name: string;
        sku: string | null;
        price: string;
        images?: { url: string }[];
      };
    }[];
  };
  organization?: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
  };
};

export type OutstandingPaymentSummary = {
  count: number;
  totalUnpaid: number;
  payments: Array<{
    id: string;
    invoiceNumber: string;
    requestNumber: string;
    outstandingAmount: number;
    status: StockPaymentStatus;
  }>;
};

export type WarehouseInventoryItem = {
  id: string;
  quantity: number;
  minQuantity: number;
  location: string | null;
  product: {
    id: string;
    name: string;
    sku: string | null;
    price: string;
    images: { url: string }[];
    category: { id: string; name: string } | null;
    businessCategory?: { id: string; name: string } | null;
  };
};

export type WarehouseProductsPage = {
  items: WarehouseInventoryItem[];
  total: number;
  hasMore: boolean;
};

export type SupplyWarehouse = {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  phone: string | null;
};

export type SuggestedStockItem = {
  quantity: number;
  alertThreshold: number;
  product: {
    id: string;
  };
};

export type StockRequestItem = {
  id: string;
  productId: string;
  quantity: number;
  approvedQuantity: number | null;
  note: string | null;
  product: {
    id: string;
    name: string;
    sku: string | null;
    price: string;
    images: { url: string }[];
  };
};

export type StockRequest = {
  id: string;
  requestNumber: string;
  status: StockRequestStatus;
  note: string | null;
  deliveryAddress: string | null;
  deliveryPhone: string | null;
  requestedAt: string;
  approvedAt: string | null;
  completedAt: string | null;
  reviewNote: string | null;
  organization: { id: string; name: string };
  warehouse: { id: string; name: string; address: string; city: string };
  requestedBy: {
    id: string;
    email: string;
    profile: { fullName: string } | null;
  };
  items: StockRequestItem[];
  payment?: StockRequestPayment;
  dispatch?: {
    id: string;
    dispatchNumber: string;
    status: string;
    driverName: string | null;
    driverPhone: string | null;
    vehicleNumber: string | null;
    dispatchedAt: string | null;
    deliveredAt: string | null;
    note: string | null;
    padaanUrl: string | null;
  } | null;
};

export type StockRequestCartItem = {
  productId: string;
  quantity: number;
  name: string;
  sku: string | null;
  price: string;
  available: number;
  image: string | null;
};

export type StockRequestView =
  | "warehouses"
  | "browse"
  | "cart"
  | "requests"
  | "payments";

export type StockRequestSection = "new" | "requests" | "payments";

export interface StockRequestUser {
  id: string;
  organizationId: string;
}
