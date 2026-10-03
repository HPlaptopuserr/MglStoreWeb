export type BusinessAppFeatureKey =
  | "pos"
  | "sales"
  | "checklist"
  | "orders"
  | "inventory"
  | "attendance"
  | "tasks"
  | "delivery";

export const BUSINESS_CAPABILITY_OPTIONS: Record<
  string,
  { label: string; feature: BusinessAppFeatureKey }
> = {
  POS_CASHIER: { label: "POS · Касс ажиллуулах", feature: "pos" },
  SALES_REPRESENTATIVE: { label: "Худалдааны төлөөлөгч", feature: "sales" },
  DELIVERY_DRIVER: { label: "Хүргэлт хийх", feature: "delivery" },
  STOCK_MANAGER: { label: "Бараа, нөөц удирдах", feature: "inventory" },
  ORDER_PROCESSOR: { label: "Захиалга боловсруулах", feature: "orders" },
  WORKFORCE_ATTENDANCE_VIEW: { label: "Ирц харах", feature: "attendance" },
  WORKFORCE_REPORT_EXPORT: {
    label: "Ирцийн тайлан татах",
    feature: "attendance",
  },
  QUALITY_INSPECTION_PERFORM: {
    label: "Checklist бөглөх",
    feature: "checklist",
  },
  QUALITY_INSPECTION_REVIEW: { label: "Checklist хянах", feature: "checklist" },
  QUALITY_TEMPLATE_MANAGE: {
    label: "Checklist загвар удирдах",
    feature: "checklist",
  },
  QUALITY_REPORT_VIEW: { label: "Чанарын тайлан харах", feature: "checklist" },
};
