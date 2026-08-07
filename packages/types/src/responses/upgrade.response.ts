export type Plan = {
  id: string;
  code?: string;
  name: string;
  price: number;
  durationDays: number;
  maxProducts: number;
  maxImages: number;
  maxCategories: number;
  hasBanner: boolean;
  hasAnalytics: boolean;
  isTrial: boolean;
  badge?: string | null;
  description?: string | null;
  isRecommended?: boolean;
  isActive?: boolean;
  sortOrder?: number;
};

export type UpgradeStatus = {
  planType: string | null;
  planActivatedAt: string | null;
  planExpiresAt: string | null;
  trialUsed: boolean;
  isActive: boolean;
  paymentConfigured: boolean;
  currentPlan: Plan | null;
  pendingInvoice: {
    invoiceId: string;
    invoiceNo: string;
    qrText: string;
    qrImage?: string | null;
    deepLinks?: Array<{
      name: string;
      description: string;
      logo: string;
      link: string;
    }>;
    amount: number;
    planType: string;
    planId?: string | null;
    createdAt: string;
  } | null;
  plans: Plan[];
};

export type UpgradeMessage = {
  type: "success" | "error";
  text: string;
};
