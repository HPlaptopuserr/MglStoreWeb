import { ClubAdminOnly } from "@/features/mgl-club/ClubAdminAccess";
import type { Metadata } from "next";
import { ClubRegistration } from "@/features/mgl-club/ClubRegistration";
export const metadata: Metadata = { title: "MGL CLUB • Бизнесээ бүртгүүлэх" };
export default function MglClubJoinPage() {
  return (
    <ClubAdminOnly>
      <ClubRegistration />
    </ClubAdminOnly>
  );
}
