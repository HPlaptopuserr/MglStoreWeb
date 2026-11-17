import {
  mglClubFields,
  type MglClubMember,
  type MglClubProfile,
} from "@mgl/types";

export function editableCompanyProfile(member: MglClubMember): MglClubProfile {
  return {
    ...Object.fromEntries(
      mglClubFields.map(({ id }) => [id, member[id] || ""]),
    ),
    consent: "yes",
    logoUrl: member.logoUrl || "",
  } as MglClubProfile;
}

export function companyProfileChanged(
  a: MglClubProfile,
  b: MglClubProfile,
): boolean {
  return (
    mglClubFields.some(({ id }) => a[id] !== b[id]) ||
    (a.logoUrl || "") !== (b.logoUrl || "")
  );
}
