"use client";

import { API } from "@/lib/api";
import type {
  CreatePersonalOrganizationResponse,
  InviteeUser,
  PersonalOrganizationOverview,
} from "./types";

export type AuthFetch = (url: string, init?: RequestInit) => Promise<Response>;

export async function readApiJson<T>(response: Response): Promise<T> {
  return response.json().catch(() => ({})) as Promise<T>;
}

export function getApiMessage(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export async function fetchPersonalOrganizationOverview(authFetch: AuthFetch) {
  const response = await authFetch(`${API}/personal-organizations/overview`);
  const data = await readApiJson<PersonalOrganizationOverview | { message?: string }>(response);

  if (!response.ok) {
    throw new Error(
      getApiMessage(data, "Байгууллагын хүсэлтүүд ачаалахад алдаа гарлаа."),
    );
  }

  return data as PersonalOrganizationOverview;
}

export async function checkOrganizationNameAvailability(
  authFetch: AuthFetch,
  name: string,
  signal: AbortSignal,
) {
  const response = await authFetch(
    `${API}/personal-organizations/name-availability?name=${encodeURIComponent(name)}`,
    { signal },
  );
  const data = await readApiJson<{ available?: boolean; message?: string }>(response);

  if (!response.ok) {
    throw new Error(
      getApiMessage(data, "Энэ нэртэй байгууллага аль хэдийн бүртгэлтэй байна."),
    );
  }

  return Boolean(data.available);
}

export async function searchInviteeUsers(
  authFetch: AuthFetch,
  query: string,
  signal: AbortSignal,
) {
  const response = await authFetch(
    `${API}/personal-organizations/user-search?q=${encodeURIComponent(query)}`,
    { signal },
  );
  const data = await readApiJson<InviteeUser[] | { message?: string }>(response);

  if (!response.ok) {
    throw new Error(getApiMessage(data, "Хэрэглэгч хайхад алдаа гарлаа."));
  }

  return Array.isArray(data) ? data : [];
}

export async function createPersonalOrganization(
  authFetch: AuthFetch,
  input: {
    organizationName: string;
    businessCategory: string;
    inviteeUserId: string;
  },
) {
  const response = await authFetch(`${API}/personal-organizations`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  const data = await readApiJson<CreatePersonalOrganizationResponse | { message?: string }>(response);

  if (!response.ok) {
    throw new Error(getApiMessage(data, "Байгууллага үүсгэхэд алдаа гарлаа."));
  }

  return data as CreatePersonalOrganizationResponse;
}

export async function respondToPersonalOrganizationInvitation(
  authFetch: AuthFetch,
  id: string,
  action: "approve" | "reject",
) {
  const response = await authFetch(`${API}/personal-organizations/invitations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action }),
  });
  const data = await readApiJson<{ message?: string }>(response);

  if (!response.ok) {
    throw new Error(getApiMessage(data, "Хүсэлт шийдвэрлэхэд алдаа гарлаа."));
  }
}
