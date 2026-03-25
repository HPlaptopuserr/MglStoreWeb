/**
 * Mock provider — used for local development / testing.
 * Always approves after a short delay. Replace or extend with a real
 * vendor SDK (e.g. Qpos, Gantigo, IDPay) when integrating hardware.
 */
import type { CardTerminalProvider, ChargeParams, ChargeResult } from "./provider.interface";

export class MockTerminalProvider implements CardTerminalProvider {
  async charge(params: ChargeParams): Promise<ChargeResult> {
    // Simulate terminal response time (1.5 s)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    return {
      status: "APPROVED",
      transactionId: `mock-txn-${params.attemptId}-${Date.now()}`,
      message: "Approved (mock)",
    };
  }
}
