import type { RestaurantPosQPayDeepLink } from "@/lib/restaurant-pos-api";

export const RESTAURANT_CUSTOMER_DISPLAY_CHANNEL =
  "mgl-restaurant-customer-display";
export const RESTAURANT_CUSTOMER_DISPLAY_STORAGE_KEY =
  "mgl_restaurant_customer_payload";

export type RestaurantCustomerDisplayOrderMode =
  | "DINE_IN"
  | "TO_GO"
  | "DELIVERY";

export type RestaurantCustomerDisplayPaymentMethod =
  | "CASH"
  | "CARD"
  | "QPAY"
  | "CREDIT";

export type RestaurantCustomerDisplayLine = {
  id: string;
  name: string;
  qty: number;
  sentQty: number;
  unitPrice: number;
  lineTotal: number;
  note?: string;
  imageUrl?: string;
};

export type RestaurantCustomerDisplayTotals = {
  subtotal: number;
  discount: number;
  total: number;
};

export type RestaurantCustomerDisplayQPay = {
  invoiceId: string;
  amount: number;
  qrText: string;
  qrImage?: string;
  status: "PENDING" | "PAID" | "EXPIRED";
  expiresAt: string;
  deepLinks?: RestaurantPosQPayDeepLink[];
};

export type RestaurantCustomerDisplaySuccess = {
  title: string;
  text: string;
  receiptNo: string;
  amount: number;
  paymentMethod?: string | null;
  ts: number;
};

export type RestaurantCustomerDisplayPayload = {
  organizationName: string;
  branchName: string;
  registerName: string;
  tableLabel: string;
  orderMode: RestaurantCustomerDisplayOrderMode;
  paymentMethod: RestaurantCustomerDisplayPaymentMethod;
  lines: RestaurantCustomerDisplayLine[];
  totals: RestaurantCustomerDisplayTotals;
  qpay: RestaurantCustomerDisplayQPay | null;
  message: string;
  success: RestaurantCustomerDisplaySuccess | null;
  updatedAt: number;
};
