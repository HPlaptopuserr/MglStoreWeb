import "server-only";
import type { MglClubDirectoryPage } from "@mgl/types";
import { API } from "@/lib/api";
export interface ClubSummary {
  total: number | null;
  sectors: number | null;
}
export async function getClubSummary(): Promise<ClubSummary> {
  try {
    const response = await fetch(`${API}/forms/mgl-club/members`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return { total: null, sectors: null };
    const page: MglClubDirectoryPage = await response.json();
    return {
      total: page.services.reduce((total, service) => total + service.count, 0),
      sectors: page.services.length,
    };
  } catch {
    return { total: null, sectors: null };
  }
}
