import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { buildingToken, buildingApiBase } from "@/lib/server/building-session";
import { ManagementShell } from "@/components/building/manage/ManagementShell";
export default async function ManageLayout({
  children,
}: {
  children: ReactNode;
}) {
  const token = await buildingToken();
  if (!token) redirect("/building/login");
  const response = await fetch(
    `${buildingApiBase}/api/building/admin/projects`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    },
  );
  if (response.status === 401 || response.status === 403)
    redirect("/building/login");
  if (!response.ok) throw new Error("Удирдлагын мэдээлэл ачаалж чадсангүй");
  return <ManagementShell>{children}</ManagementShell>;
}
