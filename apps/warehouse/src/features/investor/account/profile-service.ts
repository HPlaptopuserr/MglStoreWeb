import { API_BASE, wmsFetch } from "@/lib/api";

export interface InvestorProfile {
  fullName: string;
  email: string;
  phone: string;
}

async function readProfileResponse(
  response: Response,
): Promise<InvestorProfile> {
  const value: unknown = await response.json().catch(() => null);
  if (!value || typeof value !== "object")
    throw new Error("Профайлыг ачаалж чадсангүй.");
  const body = value as Record<string, unknown>;
  if (!response.ok)
    throw new Error(
      typeof body.message === "string"
        ? body.message
        : "Мэдээллийг хадгалж чадсангүй.",
    );
  const data =
    body.user && typeof body.user === "object"
      ? (body.user as Record<string, unknown>)
      : body;
  return {
    fullName: typeof data.fullName === "string" ? data.fullName : "",
    email: typeof data.email === "string" ? data.email : "",
    phone: typeof data.phone === "string" ? data.phone : "",
  };
}

export async function getInvestorProfile(signal: AbortSignal) {
  return readProfileResponse(await wmsFetch(`${API_BASE}/auth/me`, { signal }));
}

export async function saveInvestorProfile(profile: InvestorProfile) {
  return readProfileResponse(
    await wmsFetch(`${API_BASE}/auth/web/profile`, {
      method: "PUT",
      body: JSON.stringify(profile),
    }),
  );
}
