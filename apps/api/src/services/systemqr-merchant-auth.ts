export type SystemQrMerchantAuth = {
  username?: string;
  password?: string;
};

const SYSTEMQR_MARKER = "systemqr";
const SYSTEMQR_AUTH_VERSION = "v1";

export const isSystemQrMerchantKey = (value?: string | null) => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === SYSTEMQR_MARKER || normalized.startsWith(`${SYSTEMQR_MARKER}:`);
};

export const resolveRegisterSystemQrMerchantCode = (register?: {
  qpayEnabled?: boolean | null;
  qpayMerchantId?: string | null;
  qpayTerminalId?: string | null;
} | null) => {
  if (
    !register?.qpayEnabled ||
    !String(register.qpayMerchantId || "").trim() ||
    !isSystemQrMerchantKey(register.qpayTerminalId)
  ) {
    return null;
  }

  return String(register.qpayMerchantId).trim();
};

export const shouldRetrySystemQrWithMaster = (error: unknown) => {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code || "")
      : "";
  const providerStatus =
    error && typeof error === "object" && "providerStatus" in error
      ? String((error as { providerStatus?: unknown }).providerStatus || "")
      : "";
  if (code === "SYSTEMQR_MERCHANT_NOT_AUTHORIZED" || providerStatus === "002") {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error || "");
  return /SystemQR Login[_ ]Error|Хэрэглэгчийн нэр эсвэл нууц үг|username or password|credential|unauthorized|401|403|createInvoice failed \(002\)/i.test(
    message,
  );
};

/**
 * Stores both credentials in the existing merchant-key column without a schema
 * migration. Older rows used `systemqr:<password>` and remain readable.
 */
export function encodeSystemQrMerchantAuth(
  username?: string | null,
  password?: string | null,
) {
  const normalizedUsername = String(username || "").trim();
  const normalizedPassword = String(password || "").trim();
  if (!normalizedPassword) return SYSTEMQR_MARKER;

  const payload = Buffer.from(
    JSON.stringify({ username: normalizedUsername, password: normalizedPassword }),
    "utf8",
  ).toString("base64url");
  return `${SYSTEMQR_MARKER}:${SYSTEMQR_AUTH_VERSION}:${payload}`;
}

export function decodeSystemQrMerchantAuth(
  value?: string | null,
  fallbackUsername?: string | null,
): SystemQrMerchantAuth {
  const marker = String(value || "").trim();
  const normalizedFallback = String(fallbackUsername || "").trim() || undefined;
  if (!isSystemQrMerchantKey(marker)) return {};

  const versionedPrefix = `${SYSTEMQR_MARKER}:${SYSTEMQR_AUTH_VERSION}:`;
  if (marker.toLowerCase().startsWith(versionedPrefix)) {
    try {
      const encoded = marker.slice(versionedPrefix.length);
      const parsed = JSON.parse(
        Buffer.from(encoded, "base64url").toString("utf8"),
      ) as { username?: unknown; password?: unknown };
      const username = String(parsed.username || "").trim() || normalizedFallback;
      const password = String(parsed.password || "").trim() || undefined;
      return { username, password };
    } catch {
      return { username: normalizedFallback };
    }
  }

  const legacyPrefix = `${SYSTEMQR_MARKER}:`;
  if (marker.toLowerCase().startsWith(legacyPrefix)) {
    return {
      username: normalizedFallback,
      password: marker.slice(legacyPrefix.length).trim() || undefined,
    };
  }

  return { username: normalizedFallback };
}
