import { getClubSummary } from "@/features/mgl-club/club-summary";
import { ClubCommunitySections } from "@/features/mgl-club/ClubCommunitySections";
import type { Metadata } from "next";
import { ClubCompanies } from "@/features/mgl-club/ClubCompanies";
import { ClubDirectory } from "@/features/mgl-club/ClubDirectory";
import { ClubIntroduction } from "@/features/mgl-club/ClubIntroduction";
export const metadata: Metadata = {
  title: "MGL CLUB • Бизнесийн хамтын нийгэмлэг",
  description:
    "Бизнес эрхлэгчидтэй танилцаж, бүтээгдэхүүн үйлчилгээ санал болгох, харилцан худалдан авалт хийх MGL CLUB.",
};
export const revalidate = 60;
export default async function MglClubPage() {
  const summary = await getClubSummary();
  return (
    <>
      <ClubCompanies />
      <ClubDirectory summary={summary} />
      <ClubIntroduction />
      <ClubCommunitySections />
    </>
  );
}
