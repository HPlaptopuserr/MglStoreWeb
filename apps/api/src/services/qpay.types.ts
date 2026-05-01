export interface QPayBankAccountContext {
  account_bank_code: string;
  account_number: string;
  account_name: string;
  is_default?: boolean;
}

export interface QPayMerchantContext {
  username: string;
  password: string;
  terminalId?: string | null;
  invoiceCode?: string | null;
  merchantKey?: string | null;
  /** QuickQR: merchant UUID assigned after registration */
  merchantId?: string | null;
  /** QuickQR: bank accounts for payment routing */
  bankAccounts?: QPayBankAccountContext[] | null;
  /** QuickQR: branch code for the terminal */
  branchCode?: string | null;
}

export interface QPayCallbackConfig {
  path?: string;
  query?: Record<string, string | number | boolean | null | undefined>;
}
