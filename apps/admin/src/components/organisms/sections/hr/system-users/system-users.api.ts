import { API, adminFetch } from "@/lib/api";
import { EMPTY_USERS_SUMMARY } from "./constants";
import type {
  CreateAdminUserInput,
  SystemUser,
  UpdateMembershipOptions,
  UsersQuery,
  UsersResponse,
  UsersSummary,
} from "./types";

type ApiErrorBody = {
  message?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(data: unknown, fallback: string) {
  if (isRecord(data) && typeof data.message === "string") return data.message;
  return fallback;
}

function parseLegacyUsersResponse(data: unknown): UsersResponse | null {
  if (!Array.isArray(data)) return null;

  const items = data as SystemUser[];
  const roles: Record<string, number> = {};
  for (const user of items) {
    roles[user.role] = (roles[user.role] ?? 0) + 1;
  }

  return {
    items,
    total: items.length,
    page: 1,
    limit: items.length,
    totalPages: 1,
    summary: {
      totalUsers: items.length,
      activeUsers: items.filter((user) => user.isActive).length,
      primeUsers: items.filter((user) => user.isPrime).length,
      roles,
    },
  };
}

function parseUsersResponse(data: unknown): UsersResponse {
  const legacy = parseLegacyUsersResponse(data);
  if (legacy) return legacy;

  if (!isRecord(data)) {
    return {
      items: [],
      total: 0,
      page: 1,
      limit: 0,
      totalPages: 1,
      summary: EMPTY_USERS_SUMMARY,
    };
  }

  const summary = isRecord(data.summary)
    ? (data.summary as UsersSummary)
    : EMPTY_USERS_SUMMARY;

  return {
    items: Array.isArray(data.items) ? (data.items as SystemUser[]) : [],
    total: Number(data.total || 0),
    page: Number(data.page || 1),
    limit: Number(data.limit || 0),
    totalPages: Math.max(1, Number(data.totalPages || 1)),
    summary,
  };
}

function buildUsersParams(query: UsersQuery) {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
  });

  if (query.search.trim()) params.set("search", query.search.trim());
  if (query.role) params.set("role", query.role);
  if (query.status === "active") params.set("isActive", "true");
  if (query.status === "inactive") params.set("isActive", "false");
  if (query.prime === "prime") params.set("isPrime", "true");

  return params;
}

export async function fetchSystemUsers(query: UsersQuery) {
  const params = buildUsersParams(query);
  const res = await adminFetch(`${API}/admin/users?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Хэрэглэгчдийн мэдээлэл ачаалахад алдаа гарлаа");
  }

  return parseUsersResponse(await res.json());
}

export async function createAdminUser(input: CreateAdminUserInput) {
  const res = await adminFetch(`${API}/admin/users`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  const data = (await res.json().catch(() => null)) as ApiErrorBody | null;
  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Хэрэглэгч үүсгэхэд алдаа гарлаа"));
  }
}

export async function updateUserRole(userId: string, role: string) {
  const res = await adminFetch(`${API}/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
  const data = (await res.json().catch(() => null)) as ApiErrorBody | null;
  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Role солиход алдаа гарлаа"));
  }
}

export async function updateUserMembership(
  userId: string,
  isPrime: boolean,
  options?: UpdateMembershipOptions,
) {
  const res = await adminFetch(`${API}/admin/users/${userId}/prime`, {
    method: "PATCH",
    body: JSON.stringify({ isPrime, ...options }),
  });
  const data = (await res.json().catch(() => null)) as ApiErrorBody | null;
  if (!res.ok) {
    throw new Error(
      getErrorMessage(data, "Membership эрх солиход алдаа гарлаа"),
    );
  }
}
