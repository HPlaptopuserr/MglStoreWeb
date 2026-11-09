import type { Metadata } from "next";
import { CommunityEditor } from "../edit/CommunityEditor";
import { DemoListings } from "./DemoListings";
export const metadata: Metadata = {
  title: "2003 • Миний жагсаалт",
  robots: { index: false, follow: false },
};
export default function MyListingsPage() {
  return process.env.NODE_ENV === "development" ? (
    <DemoListings />
  ) : (
    <CommunityEditor />
  );
}
