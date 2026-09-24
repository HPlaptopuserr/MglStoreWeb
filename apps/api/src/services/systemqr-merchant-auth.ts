const SYSTEM_QR_PREFIX = "systemqr:";
const SYSTEM_QR_VERSIONED_PREFIX = "systemqr:v1:";

export type SystemQrMerchantAuth = {
  username?: string;
  password?: string;
};

export function isSystemQrMerchantKey(value?: string | null) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "systemqr" || normalized.startsWith(SYSTEM_QR_PREFIX);
}

export function encodeSystemQrMerchantAuth(
  username: string,
  password: string,
) {
  const payload = Buffer.from(
    JSON.stringify({ username: username.trim(), password }),
    "utf8",
  ).toString("base64url");

  return `${SYSTEM_QR_VERSIONED_PREFIX}${payload}`;
}

export function decodeSystemQrMerchantAuth(
  value: string | null | undefined,
  fallbackUsername?: string,
): SystemQrMerchantAuth {
  const marker = String(value || "").trim();
  const normalizedFallback = String(fallbackUsername || "").trim() || undefined;

  if (!isSystemQrMerchantKey(marker)) return {};

  if (marker.toLowerCase().startsWith(SYSTEM_QR_VERSIONED_PREFIX)) {
    try {
      const encoded = marker.slice(SYSTEM_QR_VERSIONED_PREFIX.length);
      const parsed = JSON.parse(
        Buffer.from(encoded, "base64url").toString("utf8"),
      ) as { username?: unknown; password?: unknown };
      const username =
        typeof parsed.username === "string" && parsed.username.trim()
          ? parsed.username.trim()
          : normalizedFallback;
      const password =
        typeof parsed.password === "string" && parsed.password
          ? parsed.password
          : undefined;

      return { username, password };
    } catch {
      return { username: normalizedFallback };
    }
  }

  if (marker.toLowerCase().startsWith(SYSTEM_QR_PREFIX)) {
    const password = marker.slice(SYSTEM_QR_PREFIX.length) || undefined;
    return { username: normalizedFallback, password };
  }

  return { username: normalizedFallback };
}
