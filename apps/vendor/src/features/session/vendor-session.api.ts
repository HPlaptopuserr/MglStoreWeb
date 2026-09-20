import {
  isRecord,
  parseVendorSessionUser,
  vendorAccessMode,
} from "./vendor-session.model";

export class VendorSessionExpiredError extends Error {}

async function readSessionResponse(response: Response): Promise<unknown> {
  if (response.status === 401)
    throw new VendorSessionExpiredError("Нэвтрэх хугацаа дууссан байна.");
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      isRecord(body) && typeof body.message === "string"
        ? body.message
        : "Дэлгүүрийн мэдээллийг ачаалж чадсангүй. Дахин оролдоно уу.";
    throw new Error(message);
  }
  return body;
}

export async function loadVendorSession(
  apiBase: string,
  token: string,
  signal: AbortSignal,
) {
  const response = await fetch(`${apiBase}/auth/me`, {
    cache: "no-store",
    signal,
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseVendorSessionUser(await readSessionResponse(response));
}

export async function switchVendorOrganization(
  apiBase: string,
  token: string,
  organizationId: string,
) {
  const response = await fetch(`${apiBase}/auth/vendor/switch-organization`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ organizationId }),
  });
  const body = await readSessionResponse(response);
  if (
    !isRecord(body) ||
    typeof body.accessToken !== "string" ||
    !body.accessToken.trim()
  ) {
    throw new Error(
      "Дэлгүүр солих мэдээлэл бүрэн ирсэнгүй. Дахин оролдоно уу.",
    );
  }
  const user = parseVendorSessionUser(body.user);
  const mode = vendorAccessMode(user.orgRole, user.capabilities);
  if (user.organizationId !== organizationId || !mode) {
    throw new Error(
      "Энэ дэлгүүрийн идэвхтэй гишүүнчлэл шаардлагатай. Өмнөх дэлгүүрийн нэвтрэлт хэвээр байна.",
    );
  }
  return { accessToken: body.accessToken, user, mode };
}

/** Optional display settings cannot expire an authenticated session. */
export async function loadVendorSettings(
  apiBase: string,
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(`${apiBase}/api/site-settings`, {
      cache: "no-store",
      signal,
    });
    if (!response.ok) return {};
    const value: unknown = await response.json();
    return isRecord(value) ? value : {};
  } catch {
    return {};
  }
}
