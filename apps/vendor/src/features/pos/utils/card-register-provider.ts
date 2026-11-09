import type { RegisterConfig } from "@mgl/types";

type CardConfig = Pick<
  RegisterConfig,
  | "cardEnabled"
  | "cardPaymentMode"
  | "hasOwnCardTerminal"
  | "cardProviderType"
  | "cardTerminalId"
  | "terminalBridgeUrl"
>;

export function effectiveCardProvider(
  register?:
    | (CardConfig &
        Pick<RegisterConfig, "cardFlowVersion" | "minuAgentEnabled">)
    | null,
): string | null {
  if (register?.cardFlowVersion === 2) return configuredCardProvider(register);
  // An older API has not enabled the standalone-card contract yet.
  return (
    register?.cardProviderType ||
    (register?.minuAgentEnabled ? "MINU_AGENT" : null)
  );
}

/** An unconnected till records a card payment already collected externally.
 * Organization fallback metadata never authorizes another till's device. */
export function configuredCardProvider(
  register?: CardConfig | null,
): string | null {
  if (!register?.cardEnabled || register.cardPaymentMode === "MANUAL" || register.hasOwnCardTerminal === false)
    return null;
  const provider = register.cardProviderType;
  if (provider === "MINU_AGENT" || provider === "PUSH_ECR")
    return register.cardTerminalId?.trim() ? provider : null;
  if (["ANDROID_PGW", "QPOSLANE", "GANTIGO", "IDPAY"].includes(provider ?? ""))
    return register.terminalBridgeUrl?.trim() ? provider : null;
  return null;
}
