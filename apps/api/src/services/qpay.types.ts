export interface QPayMerchantContext {
  username: string;
  password: string;
  terminalId?: string | null;
  invoiceCode?: string | null;
  merchantKey?: string | null;
}

export interface QPayCallbackConfig {
  path?: string;
  query?: Record<string, string | number | boolean | null | undefined>;
}
