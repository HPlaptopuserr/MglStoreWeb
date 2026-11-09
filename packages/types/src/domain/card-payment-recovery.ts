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

export interface TerminalCardPayment extends RecoverableCardPayment {
  status: "PENDING" | "APPROVED" | "DECLINED" | "FAILED";
  registerId: string | null;
  registerName: string;
  invoice: string;
  message: string | null;
  blocksTerminal: boolean;
}

export interface TerminalCardRecoveryResult {
  payment: TerminalCardPayment;
  outcome: "RELEASED" | "PAID" | "PENDING" | "COMPLETED";
  remainingLocks: number;
  message: string;
}
