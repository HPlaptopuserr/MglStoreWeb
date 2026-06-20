import type { Metadata } from "next";
import { ReelsPageClient } from "./_components/ReelsPageClient";

export const metadata: Metadata = {
  title: "MGL Shop Reels | MGL Store",
  description:
    "Байгууллага, дэлгүүр, бүтээгдэхүүний богино худалдааны video feed.",
};

export default function ReelsPage() {
  return <ReelsPageClient />;
}
