import type { Metadata } from "next";
import { ClubShell } from "@/features/mgl-club/ClubShell";
import { ClubRegistration } from "@/features/mgl-club/ClubRegistration";
export const metadata: Metadata = { title: "MGL CLUB • Бизнесээ бүртгүүлэх" };
export default function MglClubJoinPage() {
  return (
    <ClubShell joining>
      <ClubRegistration />
    </ClubShell>
  );
}
