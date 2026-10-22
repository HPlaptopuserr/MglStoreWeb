export type PaymentSearchMode = "reference" | "settlement";

export interface PaymentSearchResult {
  id: string;
  amount: string;
  expectedNet: string | null;
  method: string;
  status: string;
  providerRef: string | null;
  paidAt: string | null;
  orderNumber: string;
  phone: string;
  customerName: string;
  storeName: string;
  orderStatus: string;
  items: { productName: string; quantity: number }[];
}

export interface PaymentSearchResponse {
  mode: PaymentSearchMode;
  date: string;
  total: number;
  page: number;
  pageSize: number;
  data: PaymentSearchResult[];
}
