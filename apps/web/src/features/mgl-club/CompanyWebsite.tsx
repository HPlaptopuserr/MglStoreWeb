import Link from "next/link";
import type { ClubWebsite, MglClubMember } from "@mgl/types";
import { CompanyWebsite as PublicCompanyWebsite } from "@mgl/ui/company-site";
import { ClubAdminContent } from "./ClubAdminAccess";

export function CompanyWebsite({
  member,
  site,
  preview = false,
}: {
  member: MglClubMember;
  site?: ClubWebsite;
  preview?: boolean;
}) {
  return (
    <PublicCompanyWebsite
      member={member}
      site={site}
      preview={preview}
      managementLink={
        <ClubAdminContent>
          <Link href={`/mgl-club/site-builder/${member.id}`}>
            Танилцуулга засах ↗
          </Link>
        </ClubAdminContent>
      }
    />
  );
}
