import { ClubAdminOnly } from "@/features/mgl-club/ClubAdminAccess";
import { CompanyAdminManager } from "@/features/mgl-club/CompanyAdminManager";
export const metadata = { title: "Байгууллагын мэдээлэл удирдах • MGL CLUB" };
export default function ManageCompanyPage() {
  return (
    <ClubAdminOnly>
      <CompanyAdminManager />
    </ClubAdminOnly>
  );
}
