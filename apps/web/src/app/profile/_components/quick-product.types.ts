export const PREORDER_CURRENCIES = ["MNT", "USD", "CNY", "KRW", "JPY"] as const;

export type PreorderCurrency = (typeof PREORDER_CURRENCIES)[number];
export type QuickProductSupplyType = "IN_STOCK" | "CHINA_PREORDER";

export interface QuickProductFormState {
  businessCategoryId: string;
  name: string;
  price: string;
  stock: string;
  description: string;
  images: string[];
  supplyType: QuickProductSupplyType;
  preorderPriceCurrency: PreorderCurrency;
  preorderPriceAmount: string;
  preorderLeadTimeDays: string;
  preorderCapacity: string;
  preorderNote: string;
}

export type QuickProductTextField = Exclude<
  keyof QuickProductFormState,
  "images"
>;

export type QuickProductSupplyValues = Pick<
  QuickProductFormState,
  | "supplyType"
  | "preorderPriceCurrency"
  | "preorderPriceAmount"
  | "preorderLeadTimeDays"
  | "preorderCapacity"
  | "preorderNote"
>;
