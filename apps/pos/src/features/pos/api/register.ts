import { posRequest } from "./_pos-client";
import { authFetch, API } from "@/lib/api";
import type { RegisterConfig } from "../types/pos.types";

export type { RegisterConfig } from "../types/pos.types";

export type Branch = { id: string; name: string };

export const POS_REGISTER_ID_KEY = "pos_register_id";

export function fetchRegisterConfig(registerId: string): Promise<RegisterConfig> {
  return posRequest<RegisterConfig>(
    `/pos/register-config?registerId=${encodeURIComponent(registerId)}`,
  );
}

export function fetchOrgRegisters(): Promise<RegisterConfig[]> {
  return posRequest<RegisterConfig[]>("/pos/registers/mine");
}

export async function fetchBranches(organizationId: string): Promise<Branch[]> {
  const r = await authFetch(`${API}/admin/branches?organizationId=${encodeURIComponent(organizationId)}`);
  return r.ok ? r.json() : [];
}

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
