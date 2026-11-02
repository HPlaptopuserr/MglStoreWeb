import { headers } from "next/headers";
import type { ReactNode } from "react";
import { ClubShellFrame } from "./ClubShellFrame";
import { ClubWorkspaceProvider } from "./ClubWorkspaceProvider";

export async function ClubShell({
  children,
  total,
}: {
  children: ReactNode;
  total?: number | null;
}) {
  const embedded =
    (await headers()).get("user-agent")?.includes("MGLStoreApp/") ?? false;
  return (
    <ClubWorkspaceProvider>
      <ClubShellFrame embedded={embedded} total={total}>
        {children}
      </ClubShellFrame>
    </ClubWorkspaceProvider>
  );
}
