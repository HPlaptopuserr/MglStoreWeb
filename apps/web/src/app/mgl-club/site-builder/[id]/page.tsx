import { ClubAdminOnly } from "@/features/mgl-club/ClubAdminAccess";
import { CompanySiteBuilder } from "@/features/mgl-club/CompanySiteBuilder";
export const metadata = {
  title: "Байгууллагын вэб танилцуулга бэлдэх • MGL CLUB",
};
export default async function SiteBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ClubAdminOnly>
      <CompanySiteBuilder companyId={id} />
    </ClubAdminOnly>
  );
}
