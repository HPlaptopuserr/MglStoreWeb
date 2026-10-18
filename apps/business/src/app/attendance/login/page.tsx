import type { Metadata } from "next";
import { WorkforceLogin } from "@/features/workforce/components/WorkforceLogin";
export const metadata: Metadata = {
  title: "Цаг удирдлага · Нэвтрэх",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <WorkforceLogin />;
}
