import type { Metadata } from "next";
import { ClubShell } from "@/features/mgl-club/ClubShell";
import { ClubProfile } from "@/features/mgl-club/profile/ClubProfile";

export const metadata: Metadata = {
  title: "Миний клуб • MGL CLUB",
  description:
    "MGL CLUB дэх таны орон зай. Бизнесээ танилцуулж, хамтрагчидтай холбогдоорой.",
  robots: { index: false, follow: false },
};

export default function ClubProfilePage() {
  return (
    <ClubShell>
      <ClubProfile />
    </ClubShell>
  );
}
