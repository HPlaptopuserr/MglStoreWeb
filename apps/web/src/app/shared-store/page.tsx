import type { Metadata } from "next";
import { SharedStore } from "@/features/shared-store/SharedStore";
export const metadata: Metadata = {
  title: "Дундын дэлгүүр | MGL Store",
  description:
    "Агуулахын бэлэн бараанаас сонгон захиалж, Minu QR дансаар төлбөрөө хийгээрэй.",
};
export default function SharedStorePage() {
  return <SharedStore />;
}
