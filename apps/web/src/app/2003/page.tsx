import type { Metadata } from "next";
import { Directory } from "./community/Directory";
export const metadata: Metadata = {
  title: "2003 • Бидний хүрээлэл",
  robots: { index: false, follow: false },
};
export default function CommunityPage() {
  return <Directory demo={process.env.NODE_ENV === "development"} />;
}
