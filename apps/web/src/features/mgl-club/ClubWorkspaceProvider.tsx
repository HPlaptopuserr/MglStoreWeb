"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { clubRoutes } from "./club-routes";
import { useClubDirectory } from "./useClubDirectory";

function useListingState(initialScope: string, enabled: boolean) {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("");
  const [city, setCity] = useState("");
  const [scope, setScope] = useState(initialScope);
  const [visibleCount, setVisibleCount] = useState(6);
  const directory = useClubDirectory(query, sector, city, scope, enabled);
  return {
    query,
    setQuery,
    sector,
    setSector,
    city,
    setCity,
    scope,
    setScope,
    visibleCount,
    setVisibleCount,
    directory,
  };
}

interface ClubWorkspace {
  members: ReturnType<typeof useListingState>;
  needs: ReturnType<typeof useListingState>;
}
const WorkspaceContext = createContext<ClubWorkspace | null>(null);

/** Listing data and filters survive route changes, but stay scoped to the club. */
export function ClubWorkspaceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [visitedDirectory, setVisitedDirectory] = useState(
    pathname === clubRoutes.home,
  );
  const enabled = visitedDirectory || pathname === clubRoutes.home;
  if (pathname === clubRoutes.home && !visitedDirectory) {
    setVisitedDirectory(true);
  }
  const members = useListingState("services", enabled);
  const needs = useListingState("needs", enabled);
  return (
    <WorkspaceContext.Provider value={{ members, needs }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useClubWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace)
    throw new Error("Club listing must be inside ClubWorkspaceProvider");
  return workspace;
}
