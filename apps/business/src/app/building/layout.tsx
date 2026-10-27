import type { ReactNode } from "react";
import { BuildingShell } from "@/features/building/components/BuildingShell";
import "../../features/building/styles/building.css";
export default function BuildingLayout({ children }: { children: ReactNode }) {
  return <BuildingShell>{children}</BuildingShell>;
}
