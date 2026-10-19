export interface SharedWarehouse {
  id: string;
  name: string;
  address: string;
  phone: string | null;
}
export interface SharedProduct {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  price: number | string;
  stock: number;
  unit: string | null;
  orderable: boolean;
  images: { url: string }[];
  businessCategory: { id: string; name: string } | null;
  warehouse: {
    id: string;
    name: string;
    address: string;
    phone: string | null;
  } | null;
}
export interface SharedCatalog {
  warehouses?: SharedWarehouse[];
  configured: boolean;
  canOrder: boolean;
  products: SharedProduct[];
  total: number;
  hasMore: boolean;
}
export interface BasketLine {
  product: SharedProduct;
  quantity: number;
}
export interface RetailOrder {
  id: string;
  orderNumber: string;
  total: number | string;
  status: string;
  paymentStatus: string;
  expiresAt: string;
  fulfillmentIssue: string | null;
  qrText: string | null;
  deepLinks: { name?: string; description?: string; link?: string }[] | null;
  warehouse: { id: string; name: string };
  items: {
    id: string;
    productName: string;
    productId: string;
    quantity: number;
    price: number | string;
  }[];
}
export const money = (value: number | string) =>
  `${Number(value).toLocaleString("mn-MN")}₮`;
export const retailStatus: Record<string, string> = {
  PENDING: "Төлбөр хүлээж байна",
  CONFIRMED: "Захиалга баталгаажсан",
  PREPARING: "Бэлтгэж байна",
  PREPARED: "Бэлтгэгдсэн",
  SHIPPING: "Хүргэлтэд гарсан",
  COMPLETED: "Хүлээлгэн өгсөн",
  CANCELLED: "Цуцлагдсан",
};
