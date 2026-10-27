export interface BillingData {
  catalog: {
    code: string;
    name: string;
    description: string;
    price: number | null;
  }[];
  orders: {
    id: string;
    kind: string;
    addonCode: string | null;
    seats: number;
    amount: number;
    state: string;
    createdAt: string;
    paidAt: string | null;
  }[];
  paymentConfigured: boolean;
}
export interface Invoice {
  orderId: string;
  amount: number;
  invoice: {
    qr_text?: string;
    qr_image?: string;
    urls?: { name: string; description: string; link: string }[];
  };
}
