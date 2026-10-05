export type MerchantConfigurationEvent = "CONNECTED" | "DISCONNECTED" | "REGISTERED" | "BANK_ACCOUNTS_UPDATED" | "CREDENTIALS_UPDATED" | "CREDENTIALS_RECOVERED";

export interface MerchantDiagnosticsChannel {
  channel: "POS" | "WEB";
  provider: "MINU" | "QPAY" | null;
  connected: boolean;
  merchantId: string | null;
  connectedAt: string | null;
  credentialsConfigured: boolean;
  accounts: { bankCode: string; number: string; name: string; isDefault: boolean }[];
  providerVerification: "NOT_VERIFIED";
}

export interface MerchantDiagnostics {
  organizationId: string;
  readAt: string;
  channels: MerchantDiagnosticsChannel[];
  history: {
    id: string;
    createdAt: string;
    actor: string;
    channel: string;
    event: string;
  }[];
}
