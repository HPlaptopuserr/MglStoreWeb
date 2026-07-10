import { API } from "@/lib/api";
import { getJson } from "@/shared/api/http-client";
import type { ApiPartner, Investor, PartnersPage } from "./types";

type PartnersApiResponse = ApiPartner[] | {
  data?: ApiPartner[];
  pagination?: { total?: number; totalPages?: number };
};

export async function getPartnersPage(query: string): Promise<PartnersPage> {
  const raw = await getJson<PartnersApiResponse>(`${API}/partners?${query}`);
  const data = Array.isArray(raw) ? raw : raw.data ?? [];
  return {
    data,
    pagination: {
      total: Array.isArray(raw) ? data.length : raw.pagination?.total ?? data.length,
      totalPages: Array.isArray(raw) ? 1 : raw.pagination?.totalPages ?? 1,
    },
  };
}

export function getInvestors(): Promise<Investor[]> {
  return getJson<Investor[]>(`${API}/investors`);
}
