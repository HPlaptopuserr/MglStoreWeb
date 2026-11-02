import { headers } from "next/headers";
import type { ReactNode } from "react";
import { CommunityShell } from "@/features/community-2003/CommunityShell";
export default async function CommunityLayout({
  children,
}: {
  children: ReactNode;
}) {
  const embedded =
    (await headers()).get("user-agent")?.includes("MGLStoreApp/") ?? false;
  return <CommunityShell embedded={embedded}>{children}</CommunityShell>;
}
