import type { Metadata } from "next";
import { CommunityEditor } from "./CommunityEditor";
export const metadata: Metadata = {
  title: "2003 • Мэдээллээ засах",
  robots: { index: false, follow: false },
};
export default function EditPage() {
  return <CommunityEditor />;
}
