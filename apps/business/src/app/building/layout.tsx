import type { ReactNode } from "react";
import { BuildingShell } from "@/components/building/BuildingShell";
import "./building.css";
export default function BuildingLayout({ children }: { children: ReactNode }) {
  return <BuildingShell>{children}</BuildingShell>;
}
