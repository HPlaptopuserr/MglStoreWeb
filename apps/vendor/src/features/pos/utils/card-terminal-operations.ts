import type { RegisterConfig } from "../types/pos.types";
import type { ShiftTerminal } from "../api/close-shift-with-settlement";

type BridgeOperationConfig = Pick<
  RegisterConfig,
  "cardProviderType" | "bridgePairingRequired"
>;

/** Missing metadata is the existing till contract, not implicit enrollment. */
export function usesPairedAndroidPgwCommands(
  register?: BridgeOperationConfig | null,
): boolean {
  return (
    register?.cardProviderType === "ANDROID_PGW" &&
    register.bridgePairingRequired === true
  );
}

export function shiftSettlementTerminal(
  register: BridgeOperationConfig &
    Pick<RegisterConfig, "id" | "cardTerminalId">,
  effectiveProvider: string | null | undefined,
): ShiftTerminal | undefined {
  if (effectiveProvider === "PUSH_ECR")
    return register.cardTerminalId || undefined;
  if (
    effectiveProvider === "ANDROID_PGW" &&
    usesPairedAndroidPgwCommands(register)
  )
    return { pgwRegisterId: register.id };
  return undefined;
}
