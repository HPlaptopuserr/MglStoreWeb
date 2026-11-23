import type { RegisteredCreditBorrower } from "@mgl/types";

export function registeredBorrowerPhone(value: string): string | null {
  const trimmed = value.trim();
  if (!/^[+\d\s()-]+$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  const phone =
    digits.length === 11 && digits.startsWith("976") ? digits.slice(3) : digits;
  return /^\d{8}$/.test(phone) ? phone : null;
}

type LookupScope = { requestId: number; organizationId: string; phone: string };
export type RegisteredBorrowerLookupState =
  | { status: "idle" }
  | ({ status: "loading" } & LookupScope)
  | ({ status: "ready"; user: RegisteredCreditBorrower } & LookupScope)
  | ({ status: "empty" } & LookupScope)
  | { status: "error"; message: string };
export type RegisteredBorrowerLookupAction =
  | { type: "reset" }
  | ({ type: "start" } & LookupScope)
  | {
      type: "resolved";
      requestId: number;
      user: RegisteredCreditBorrower | null;
    }
  | { type: "failed"; requestId: number; message: string }
  | { type: "invalid"; message: string };

export function registeredBorrowerLookupReducer(
  state: RegisteredBorrowerLookupState,
  action: RegisteredBorrowerLookupAction,
): RegisteredBorrowerLookupState {
  if (action.type === "reset") return { status: "idle" };
  if (action.type === "invalid")
    return { status: "error", message: action.message };
  if (action.type === "start")
    return {
      status: "loading",
      requestId: action.requestId,
      organizationId: action.organizationId,
      phone: action.phone,
    };
  if (state.status !== "loading" || state.requestId !== action.requestId)
    return state;
  if (action.type === "failed")
    return { status: "error", message: action.message };
  return action.user
    ? { ...state, status: "ready", user: action.user }
    : { ...state, status: "empty" };
}

export function verifiedCreditBorrower(
  state: RegisteredBorrowerLookupState,
  organizationId: string,
  phone: string,
): RegisteredCreditBorrower | null {
  return state.status === "ready" &&
    state.organizationId === organizationId &&
    state.phone === registeredBorrowerPhone(phone) &&
    state.user.phoneNumber === state.phone
    ? state.user
    : null;
}
