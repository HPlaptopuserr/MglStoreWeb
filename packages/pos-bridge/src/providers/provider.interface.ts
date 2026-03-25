/**
 * Card terminal provider interface.
 *
 * To add a new card terminal vendor, create a class that implements this
 * interface and register it in src/index.ts.
 */
export interface CardTerminalProvider {
  /**
   * Attempt a card payment.
   * Resolves with the result once the terminal confirms or declines.
   */
  charge(params: ChargeParams): Promise<ChargeResult>;
}

export type ChargeParams = {
  attemptId: string;
  amount: number;
  terminalId: string;
};

export type ChargeResult = {
  /** "APPROVED" | "DECLINED" | "FAILED" */
  status: "APPROVED" | "DECLINED" | "FAILED";
  transactionId?: string;
  message?: string;
};
