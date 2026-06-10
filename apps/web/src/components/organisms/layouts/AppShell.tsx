"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/organisms/layouts/Header";
import { Footer } from "@/components/organisms/layouts/Footer";
import { SmoothScrollProvider } from "@/components/organisms/layouts/SmoothScrollProvider";
import { ChatBot } from "@/components/organisms/ChatBot";
import { ActiveCheckoutDispatchAlert } from "@/components/organisms/checkout/ActiveCheckoutDispatchAlert";
import { AuthProvider } from "@/lib/auth-context";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isContractRoute = pathname?.startsWith("/contract");
  const isProfileRoute = pathname?.startsWith("/profile");

  return (
    <AuthProvider>
      <SmoothScrollProvider>
        {!isContractRoute && <Header />}
        {!isContractRoute && <ActiveCheckoutDispatchAlert />}
        <main
          className={
            isContractRoute
              ? "grow"
              : isProfileRoute
              ? "grow pt-16 pb-20 md:pt-16 md:pb-0"
              : "grow pt-40 pb-20 md:pt-32 md:pb-0"
          }
        >
          {children}
        </main>
        {!isContractRoute && <ChatBot />}
        {!isContractRoute && <Footer />}
      </SmoothScrollProvider>
    </AuthProvider>
  );
}
