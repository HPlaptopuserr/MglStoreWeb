import type { RegisterConfig } from "@mgl/types";

type CardConfig = Pick<
  RegisterConfig,
  | "cardEnabled"
  | "hasOwnCardTerminal"
  | "cardProviderType"
  | "cardTerminalId"
  | "terminalBridgeUrl"
>;

/** An unconnected till records a card payment already collected externally.
 * Organization fallback metadata never authorizes another till's device. */
export function configuredCardProvider(
  register?: CardConfig | null,
): string | null {
  if (!register?.cardEnabled || register.hasOwnCardTerminal === false)
    return null;
  const provider = register.cardProviderType;
  if (provider === "MINU_AGENT" || provider === "PUSH_ECR")
    return register.cardTerminalId?.trim() ? provider : null;
  if (["ANDROID_PGW", "QPOSLANE", "GANTIGO", "IDPAY"].includes(provider ?? ""))
    return register.terminalBridgeUrl?.trim() ? provider : null;
  return null;
}
