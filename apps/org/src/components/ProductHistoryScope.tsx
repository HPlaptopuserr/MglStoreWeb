"use client";
import { ProductHistoryProvider } from "@mgl/ui";
import { API, authFetch } from "@/lib/api";
import type { ReactNode } from "react";
export default function ProductHistoryScope({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ProductHistoryProvider api={API} request={authFetch}>
      {children}
    </ProductHistoryProvider>
  );
}
