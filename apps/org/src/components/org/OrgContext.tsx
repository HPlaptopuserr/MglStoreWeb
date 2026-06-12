"use client";

import { createContext, ReactNode, useContext } from "react";
import { OrgUser } from "@/lib/api";
import { OrgFeatureState } from "@/lib/org-types";

type OrgContextValue = {
  user: OrgUser;
  features: OrgFeatureState;
  logout: () => void;
};

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: OrgContextValue;
}) {
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error("useOrg must be used inside OrgProvider");
  }
  return context;
}
