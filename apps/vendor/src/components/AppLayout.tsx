"use client";

import { VendorHeader } from "@/components/VendorHeader";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="flex flex-1 flex-col overflow-hidden">
        <VendorHeader />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
