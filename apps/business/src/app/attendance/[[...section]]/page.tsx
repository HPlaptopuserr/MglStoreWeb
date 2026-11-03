import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { workforceToken } from "@/features/workforce/server/workforce-session";
import { WorkforceApp } from "@/features/workforce/WorkforceApp";
import {
  sections,
  type WorkforceSection,
} from "@/features/workforce/model/navigation";
export const metadata: Metadata = {
  title: "Цаг удирдлага",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  const name = section?.[0] ?? "overview";
  if ((section?.length ?? 0) > 1 || !sections.some((s) => s.id === name))
    notFound();
  if (!(await workforceToken())) redirect("/attendance/login");
  return <WorkforceApp section={name as WorkforceSection} />;
}
