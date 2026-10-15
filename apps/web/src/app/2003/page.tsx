import type { Metadata } from "next";
import { Directory } from "./community/Directory";
import LegacyRegistration from "./join/LegacyRegistration";
export const metadata: Metadata = {
  title: "2003 • Бидний хүрээлэл",
  robots: { index: false, follow: false },
};
export default function CommunityPage() {
  // Keep fictional data local until authenticated member visibility is implemented.
  if (process.env.NODE_ENV !== "development") return <LegacyRegistration />;
  return <Directory />;
}
