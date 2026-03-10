"use client";

import { AppLayout } from "@/components/AppLayout";
import { usePathname } from "next/navigation";

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.includes("/login");

  return isAuthPage ? children : <AppLayout>{children}</AppLayout>;
}
