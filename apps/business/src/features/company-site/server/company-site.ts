import "server-only";
import { cache } from "react";
import {
  isClubSiteSlug,
  type ClubWebsite,
  type MglClubMember,
} from "@mgl/types";
import { innovaCompany, innovaWebsite } from "@mgl/ui/company-site/innova";
import { businessApiBase } from "@/shared/server/api-config";

interface CompanySite {
  member: MglClubMember;
  website: ClubWebsite | null;
  siteSlug: string;
}

export const getCompanySite = cache(
  async (slug: string): Promise<CompanySite | null> => {
    if (!isClubSiteSlug(slug)) return null;
    if (process.env.NODE_ENV !== "production" && slug === "innovallc") {
      return { member: innovaCompany, website: innovaWebsite, siteSlug: slug };
    }
    const response = await fetch(
      `${businessApiBase}/api/forms/mgl-club/sites/${encodeURIComponent(slug)}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Company site unavailable");
    return response.json() as Promise<CompanySite>;
  },
);
