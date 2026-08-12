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
  const isOrdersRoute = pathname?.startsWith("/orders");
  const isReelsRoute = pathname?.startsWith("/reels");
  const isMglStoreRoute = pathname === "/mgl-store";
  const isProductsRoute = pathname?.startsWith("/products");
  const isCheckoutRoute = pathname === "/checkout";
  const isOrganizationStorefrontRoute =
    /^\/(?:o|organizations)\/[^/]+\/?$/.test(pathname || "");
  const isPaidAccessDetailRoute = /^\/(projects|franchise)\/[^/]+/.test(
    pathname || "",
  );
  const hideGlobalShell =
    isContractRoute ||
    isPaidAccessDetailRoute ||
    isReelsRoute ||
    isOrganizationStorefrontRoute;
  const hideGlobalFooter =
    hideGlobalShell || isProfileRoute || isCheckoutRoute;

  return (
    <AuthProvider>
      <SmoothScrollProvider>
        {!hideGlobalShell && <Header />}
        {!hideGlobalShell && <ActiveCheckoutDispatchAlert />}
        <main
          className={
            hideGlobalShell
              ? "grow"
              : isCheckoutRoute
                ? "grow pt-20 md:pt-[5.5rem]"
              : isProfileRoute || isOrdersRoute
                ? "grow pt-24 pb-20 md:pt-24 md:pb-0"
                : isProductsRoute
                  ? "grow pt-40 pb-20 md:pt-24 md:pb-0"
                  : isMglStoreRoute
                    ? "grow pt-24 pb-20 md:pt-40 md:pb-0"
                    : "grow pt-48 pb-20 md:pt-40 md:pb-0"
          }
        >
          {children}
        </main>
        {!hideGlobalFooter && <ChatBot />}
        {!hideGlobalFooter && (
          <Footer variant={isProductsRoute ? "catalog" : "default"} />
        )}
      </SmoothScrollProvider>
    </AuthProvider>
  );
}
