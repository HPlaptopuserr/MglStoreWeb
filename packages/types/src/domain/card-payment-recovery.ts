/** Existing POS payment references; approval must be verified with Minu before use. */
export interface RecoverableCardPayment {
  attemptId: string;
  amount: number;
  createdAt: string;
  terminalId: string;
  status: string;
  transactionId: string | null;
}

export interface VerifiedCardRecovery extends RecoverableCardPayment {
  status: "APPROVED";
  transactionId: string;
}
