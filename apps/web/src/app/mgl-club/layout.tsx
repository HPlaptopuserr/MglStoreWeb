import type { ReactNode } from "react";
import { ClubShell } from "@/features/mgl-club/ClubShell";
import { getClubSummary } from "@/features/mgl-club/club-summary";

/** Keep the club shell, navigation and listing state mounted across its routes. */
export default async function MglClubLayout({
  children,
}: {
  children: ReactNode;
}) {
  const summary = await getClubSummary();
  return <ClubShell total={summary.total}>{children}</ClubShell>;
}
