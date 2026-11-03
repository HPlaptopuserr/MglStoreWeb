import { assertRetailRegister } from "../utils/retail-register-policy";
import { posRequest } from "./_pos-client";
import { authFetch, API } from "@/lib/api";
import type { RegisterConfig } from "@mgl/types";

export type { RegisterConfig } from "@mgl/types";

export type Branch = { id: string; name: string };

export const POS_REGISTER_ID_KEY = "pos_register_id";

export function getPosRegisterIdKey(organizationId: string) {
  const scope = String(organizationId || "").trim();
  return scope ? `${POS_REGISTER_ID_KEY}:${scope}` : POS_REGISTER_ID_KEY;
}

export async function fetchRegisterConfig(
  registerId: string,
): Promise<RegisterConfig> {
  const register = await posRequest<RegisterConfig>(
    `/pos/register-config?registerId=${encodeURIComponent(registerId)}&mode=RETAIL`,
  );
  assertRetailRegister(register);
  return register;
}

export async function fetchOrgRegisters(): Promise<RegisterConfig[]> {
  const registers = await posRequest<RegisterConfig[]>(
    "/pos/registers/mine?mode=RETAIL",
  );
  return registers.filter((register) => register.mode === "RETAIL");
}

export async function fetchBranches(organizationId: string): Promise<Branch[]> {
  const r = await authFetch(
    `${API}/admin/branches?organizationId=${encodeURIComponent(organizationId)}`,
  );
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
