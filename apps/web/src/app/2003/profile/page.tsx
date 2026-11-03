import type { Metadata } from "next";
import { CommunityProfile } from "@/features/community-2003/CommunityProfile";
export const metadata: Metadata = {
  title: "2003 • Миний профайл",
  robots: { index: false, follow: false },
};
export default function ProfilePage() {
  return <CommunityProfile />;
}
