import type { Metadata } from "next";
import { ClubRegistration } from "@/features/mgl-club/ClubRegistration";
export const metadata: Metadata = { title: "MGL CLUB • Бизнесээ бүртгүүлэх" };
export default function MglClubJoinPage() {
  return <ClubRegistration />;
}
