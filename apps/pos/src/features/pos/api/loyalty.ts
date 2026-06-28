import { posRequest } from "./_pos-client";

export type LoyaltyRedeemSessionStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CONSUMED"
  | "EXPIRED"
  | "CANCELLED";

export type LoyaltyRedeemSession = {
  id: string;
  token: string;
  qrPayload: string;
  status: LoyaltyRedeemSessionStatus;
  phone: string;
  customerName?: string | null;
  balance: number;
  requestedPoints: number;
  saleTotal: number;
  expiresAt: string;
  confirmedAt?: string | null;
};

export function createLoyaltyRedeemSession(payload: {
  phone: string;
  redeemPoints: number;
  saleTotal: number;
  branchId: string;
  registerId?: string;
  organizationId?: string;
}): Promise<LoyaltyRedeemSession> {
  return posRequest<LoyaltyRedeemSession>("/pos/loyalty/redeem-sessions", {
    method: "POST",
    body: payload,
  });
}

export function getLoyaltyRedeemSessionStatus(
  sessionId: string,
): Promise<LoyaltyRedeemSession> {
  return posRequest<LoyaltyRedeemSession>(
    `/pos/loyalty/redeem-sessions/${encodeURIComponent(sessionId)}`,
  );
}
