import { API, authFetch } from "@/lib/api";
import {
  parsePersonalAccounts,
  parseStoreEmployee,
  parseStoreEmployees,
} from "./store-employee.validation";

async function employeeRequest<T>(
  path: string,
  parse: (value: unknown) => T,
  init?: RequestInit,
): Promise<T> {
  const response = await authFetch(`${API}/org/members${path}`, {
    cache: "no-store",
    ...init,
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : null;
    throw new Error(
      response.status === 403
        ? "Энэ дэлгүүрийн ажилтнуудыг удирдах эрх хүрэлцэхгүй байна."
        : message ||
            "Мэдээллийг авч чадсангүй. Түр хүлээгээд дахин оролдоно уу.",
    );
  }
  return parse(body);
}

export const employeeApi = {
  list: (organizationId: string, signal: AbortSignal) =>
    employeeRequest(
      `?${new URLSearchParams({ organizationId })}`,
      parseStoreEmployees,
      { signal },
    ),
  search: (organizationId: string, search: string, signal: AbortSignal) =>
    employeeRequest(
      `/personal-accounts?${new URLSearchParams({ organizationId, search })}`,
      parsePersonalAccounts,
      { signal },
    ),
  assign: (organizationId: string, userId: string) =>
    employeeRequest("/assign-personal-account", parseStoreEmployee, {
      method: "POST",
      body: JSON.stringify({
        organizationId,
        userId,
        assignment: "POS_CASHIER",
      }),
    }),
  setStatus: (organizationId: string, memberId: string, isActive: boolean) =>
    employeeRequest(
      `/${encodeURIComponent(memberId)}/status`,
      parseStoreEmployee,
      {
        method: "PATCH",
        body: JSON.stringify({ organizationId, isActive }),
      },
    ),
};

export function employeeErrorMessage(error: unknown) {
  return error instanceof Error && error.name !== "TypeError"
    ? error.message
    : "Холболт тасарсан байна. Интернэтээ шалгаад дахин оролдоно уу.";
}
