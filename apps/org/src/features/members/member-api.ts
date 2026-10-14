import { API, authFetch } from "@/lib/api";
import type {
  MemberCapability,
  MemberRole,
  OrganizationMember,
} from "./member-types";

type CreateMemberInput = {
  organizationId: string;
  fullName: string;
  email: string;
  phone?: string;
  password?: string;
  role: MemberRole;
  department?: string;
  capabilities: MemberCapability[];
};

type UpdateMemberInput = {
  department?: string | null;
  capabilities?: MemberCapability[];
};

async function memberRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authFetch(`${API}/org/members${path}`, {
    cache: "no-store",
    ...init,
  });
  const body = (await response.json().catch(() => null)) as
    | { message?: unknown }
    | null;

  if (!response.ok) {
    const message =
      body && typeof body.message === "string"
        ? body.message
        : "Үйлдлийг гүйцэтгэж чадсангүй. Дахин оролдоно уу.";
    throw new Error(message);
  }

  return body as T;
}

function parseMembers(value: unknown): OrganizationMember[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is OrganizationMember =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as OrganizationMember).id === "string" &&
      typeof (item as OrganizationMember).userId === "string",
  );
}

function parseCapabilities(value: unknown): MemberCapability[] {
  const allowed: MemberCapability[] = [
    "POS_CASHIER",
    "DELIVERY_DRIVER",
    "STOCK_MANAGER",
    "ORDER_PROCESSOR",
  ];
  const capabilities =
    value &&
    typeof value === "object" &&
    "capabilities" in value &&
    Array.isArray(value.capabilities)
      ? value.capabilities
      : [];
  return capabilities.filter(
    (item): item is MemberCapability =>
      typeof item === "string" && allowed.includes(item as MemberCapability),
  );
}

export const memberApi = {
  async list(organizationId: string, signal?: AbortSignal) {
    const query = new URLSearchParams({ organizationId }).toString();
    const response = await authFetch(`${API}/org/members?${query}`, {
      cache: "no-store",
      signal,
    });
    const body = (await response.json().catch(() => null)) as
      | { message?: unknown }
      | unknown[]
      | null;
    if (!response.ok) {
      throw new Error(
        body && !Array.isArray(body) && typeof body.message === "string"
          ? body.message
          : "Ажилтнуудын жагсаалтыг авч чадсангүй.",
      );
    }
    return parseMembers(body);
  },

  async availableCapabilities(organizationId: string, signal?: AbortSignal) {
    const query = new URLSearchParams({ organizationId }).toString();
    const response = await authFetch(
      `${API}/org/members/available-capabilities?${query}`,
      { cache: "no-store", signal },
    );
    const body = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) {
      throw new Error("Ажлын эрхүүдийг авч чадсангүй.");
    }
    return parseCapabilities(body);
  },

  create(input: CreateMemberInput) {
    return memberRequest("", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  update(memberId: string, input: UpdateMemberInput) {
    return memberRequest(`/${encodeURIComponent(memberId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  changeRole(memberId: string, role: MemberRole) {
    return memberRequest(`/${encodeURIComponent(memberId)}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  },

  toggle(memberId: string) {
    return memberRequest(`/${encodeURIComponent(memberId)}/toggle`, {
      method: "PATCH",
      body: JSON.stringify({}),
    });
  },

  remove(memberId: string) {
    return memberRequest(`/${encodeURIComponent(memberId)}`, {
      method: "DELETE",
    });
  },
};
