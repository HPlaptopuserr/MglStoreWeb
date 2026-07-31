export type OnlineOrderStatus =
  | "CONFIRMED"
  | "PREPARING"
  | "PREPARED"
  | "SHIPPING"
  | "COMPLETED"
  | "CANCELLED";

export interface OnlineOrderItem {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string | null;
  imageUrl: string | null;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface OnlineOrder {
  id: string;
  orderNumber: string;
  status: OnlineOrderStatus;
  paymentStatus: "PAID";
  paymentMethod: string | null;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  total: number;
  phone: string;
  shippingAddress: string;
  note: string | null;
  createdAt: string;
  customerLocation: { lat: number; lng: number } | null;
  payment: {
    method: string;
    status: "PAID";
    amount: number;
    providerRef: string | null;
    paidAt: string | null;
  } | null;
  organization: { id: string; name: string };
  branch: { id: string; name: string; address: string | null } | null;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  delivery: {
    id: string;
    status: string;
    packageCount: number;
    totalWeightKg: number | null;
    packageLengthCm: number | null;
    packageWidthCm: number | null;
    packageHeightCm: number | null;
    sizeCategory: string | null;
    isFragile: boolean;
    handlingInstructions: string | null;
    readyAt: string | null;
    partnershipId: string | null;
    providerOrganization: { id: string; name: string } | null;
    courier: {
      id: string;
      email: string;
      profile: { fullName: string; phoneNumber: string | null } | null;
    } | null;
  } | null;
  items: OnlineOrderItem[];
}

export interface OnlineOrdersResponse {
  orders: OnlineOrder[];
  total: number;
}

export interface DeliveryAssignmentPartnership {
  id: string;
  warehouseId: string;
  provider: { id: string; name: string };
  couriers: Array<{
    id: string;
    email: string;
    profile: { fullName: string; phoneNumber: string | null } | null;
    deliveryDriverProfile?: { vehiclePlateNumber: string | null } | null;
  }>;
}
