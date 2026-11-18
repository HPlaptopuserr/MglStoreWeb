import {
  isClubSiteSlug,
  matchesClubSearch,
  type MglClubMember,
} from "@mgl/types";
import { innovaCompany } from "@mgl/ui/company-site/innova";
import { companySiteOrigin } from "@/lib/company-site-url";

export interface GoldCompany {
  member: MglClubMember;
  href: string;
}

/** System-admin-selected listing; does not create invoices or mark payments settled. */
export function goldCompanies(
  members: readonly MglClubMember[],
  filters: { query: string; sector: string; city: string },
  innova: MglClubMember = innovaCompany,
): GoldCompany[] {
  const query = filters.query.trim().toLowerCase();
  const showInnova =
    (!filters.city || filters.city === innova.city) &&
    (!filters.sector || filters.sector === innova.sector) &&
    matchesClubSearch(
      `${innova.businessName} innova innovallc ${innova.offers} ${innova.description}`,
      query,
    );
  const name = (value: string) =>
    value.trim().toLowerCase().replace(/\s+/g, " ");
  const result: GoldCompany[] = showInnova
    ? [{ member: innova, href: `${companySiteOrigin}/innovallc` }]
    : [];
  return [
    ...result,
    ...members
      .filter(
        (member) =>
          member.id !== innova.id &&
          member.id !== innovaCompany.id &&
          name(member.businessName) !== name(innova.businessName) &&
          name(member.businessName) !== name(innovaCompany.businessName),
      )
      .map((member) => ({
        member,
        href: isClubSiteSlug(member.siteSlug)
          ? `${companySiteOrigin}/${member.siteSlug}`
          : `/mgl-club/companies/${member.id}`,
      })),
  ];
}
