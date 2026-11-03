/** Public checkout details shown on the shopper-facing screen. */
export interface CustomerDisplayDetails {
  registerName?: string;
  branchName?: string;
  cashierName?: string;
  loyaltyPoints?: number | null;
}

import type { CashPaymentDetails, CartLine, CartTotals } from "@mgl/types";
import type { CheckoutLoyaltyRedeemSession } from "../components/PosCheckoutView";
import type { CustomerDisplayThemeId } from "../components/PosCustomerDisplay";

export interface CustomerDisplaySuccessDetails {
  text: string;
  amount: number;
  ts: number;
  cash?: CashPaymentDetails;
  saleCompleted?: boolean;
}

export type CustomerDisplayPayload = CustomerDisplayDetails & {
  lines: CartLine[];
  totals: CartTotals;
  displayTheme?: CustomerDisplayThemeId;
  qpayModal: {
    open: boolean;
    invoiceId: string;
    amount: number;
    qrText: string;
    qrImage: string;
    expiresAt: string;
  } | null;
  loyaltyRedeemSession?: CheckoutLoyaltyRedeemSession | null;
  customerSuccess?: CustomerDisplaySuccessDetails | null;
  ts: number;
};
