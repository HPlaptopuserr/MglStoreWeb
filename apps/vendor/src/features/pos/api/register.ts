import { posRequest } from "./_pos-client";
import { authFetch, API } from "@/lib/api";

export type Branch = { id: string; name: string };

export const POS_REGISTER_ID_KEY = "pos_register_id";

export type RegisterConfig = {
  id: string;
  name: string;
  label: string | null;
  cardEnabled: boolean;
  /** "PUSH_ECR" | "BRIDGE" | null */
  cardProviderType: string | null;
  cardTerminalId: string | null;
  terminalBridgeUrl: string | null;
  qpayEnabled: boolean;
  qpayMerchantId: string | null;
  qpayTerminalId: string | null;
  isActive: boolean;
  branchId: string;
  organizationId: string;
  branch: { id: string; name: string };
};

export function fetchRegisterConfig(registerId: string): Promise<RegisterConfig> {
  return posRequest<RegisterConfig>(
    `/pos/register-config?registerId=${encodeURIComponent(registerId)}`,
  );
}

/** Байгууллагын өөрийн бүх register-үүдийг татах */
export function fetchOrgRegisters(): Promise<RegisterConfig[]> {
  return posRequest<RegisterConfig[]>("/pos/registers/mine");
}

/** Байгууллагын салбаруудыг татах (register setup panel-д хэрэглэнэ) */
export async function fetchBranches(organizationId: string): Promise<Branch[]> {
  const r = await authFetch(`${API}/admin/branches?organizationId=${encodeURIComponent(organizationId)}`);
  return r.ok ? r.json() : [];
}

/** Кассыг өөрөө бүртгэх (admin батлах шаардлагатай) */
export function selfClaimRegister(payload: {
  organizationId: string;
  branchId: string;
  name: string;
}): Promise<RegisterConfig> {
  return posRequest<RegisterConfig>("/pos/registers/self-claim", {
    method: "POST",
    body: payload,
  });
}
