import { ClubAdminOnly } from "@/features/mgl-club/ClubAdminAccess";
import { CompanyBlogManager } from "@/features/mgl-club/CompanyBlogManager";
export const metadata = { title: "Байгууллагын блог удирдах • MGL CLUB" };
export default function ManageCompanyPage() {
  return (
    <ClubAdminOnly>
      <CompanyBlogManager />
    </ClubAdminOnly>
  );
}
