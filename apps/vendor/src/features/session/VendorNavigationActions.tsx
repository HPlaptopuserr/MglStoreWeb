"use client";

import { createContext, useContext, type ReactNode } from "react";

const NavigationActionsContext = createContext<ReactNode>(null);

/** Allows the POS navigation to reuse the layout-owned organization session. */
export function VendorNavigationActionsProvider({
  actions,
  children,
}: {
  actions: ReactNode;
  children: ReactNode;
}) {
  return (
    <NavigationActionsContext.Provider value={actions}>
      {children}
    </NavigationActionsContext.Provider>
  );
}

export function VendorNavigationActions() {
  return useContext(NavigationActionsContext);
}
