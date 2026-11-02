"use client";
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { DirectoryTab } from "@/app/2003/community/model";
interface DirectoryFilters {
  tab: DirectoryTab;
  query: string;
  city: string;
  sector: string;
}
const initial: DirectoryFilters = {
  tab: "all",
  query: "",
  city: "",
  sector: "",
};
const Workspace = createContext<{
  filters: DirectoryFilters;
  setFilters: Dispatch<SetStateAction<DirectoryFilters>>;
} | null>(null);
export function CommunityWorkspace({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState(initial);
  return (
    <Workspace.Provider value={{ filters, setFilters }}>
      {children}
    </Workspace.Provider>
  );
}
export function useCommunityFilters() {
  const value = useContext(Workspace);
  if (!value) throw new Error("CommunityWorkspace is required");
  return value;
}
