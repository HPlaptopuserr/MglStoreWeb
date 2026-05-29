export type MerchantStatus = {
  isConnected: boolean;
  merchantId: string | null;
  connectedAt: string | null;
  orgName: string;
  managedBySystem?: boolean;
  provider?: string;
};

export type MinuAgentStatus = {
  isConnected: boolean;
  username: string | null;
  branchId: string | null;
  passwordSet: boolean;
  connectedAt: string | null;
  orgName: string;
};

export type BankAccount = {
  account_bank_code: string;
  account_number: string;
  account_name: string;
  is_default: boolean;
};

export type City = { code: string; name: string; districts?: District[] };
export type District = { code: string; name: string };
export type Khoroo = { code: string; name: string };

export type SystemQrCategory = {
  code: string;
  name: string;
  categoryCode?: string;
  categoryName?: string;
};

export type MerchantSettingsMode = "qpay" | "terminal";
export type ManualPaymentProvider = "qpay" | "systemqr";
export type MerchantMessage = { type: "success" | "error"; text: string };
