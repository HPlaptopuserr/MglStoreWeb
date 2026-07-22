import type { Metadata } from "next";
import { MglStoreLanding } from "./_components/MglStoreLanding";

export const metadata: Metadata = {
  title: "MGL Store танилцуулга | MGL Store",
  description:
    "MGL Store-ийн үр ашиг, салбар дэлгүүрийн сүлжээ болон бүх салбарын байршлын мэдээлэл.",
};

export default function MglStorePage() {
  return <MglStoreLanding />;
}
