import type { MglClubMember } from "@mgl/types";
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
): GoldCompany[] {
  const query = filters.query.trim().toLowerCase();
  const showInnova =
    (!filters.city || filters.city === innovaCompany.city) &&
    (!filters.sector || filters.sector === innovaCompany.sector) &&
    (!query ||
      `${innovaCompany.businessName} innova innovallc ${innovaCompany.offers} ${innovaCompany.description}`
        .toLowerCase()
        .includes(query));
  const name = (value: string) =>
    value.trim().toLowerCase().replace(/\s+/g, " ");
  const result: GoldCompany[] = showInnova
    ? [{ member: innovaCompany, href: `${companySiteOrigin}/innovallc` }]
    : [];
  return [
    ...result,
    ...members
      .filter(
        (member) =>
          member.id !== innovaCompany.id &&
          name(member.businessName) !== name(innovaCompany.businessName),
      )
      .map((member) => ({ member, href: `/mgl-club/companies/${member.id}` })),
  ];
}
