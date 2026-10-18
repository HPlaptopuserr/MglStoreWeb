"use client";
import { usePathname } from "next/navigation";
import { MglAppBootLoader } from "@mgl/ui";
import { WorkforceLoadingScreen } from "@/features/workforce/components/WorkforceLoadingScreen";
import { DigitalLoadingContent } from "./loading/DigitalLoadingContent";
import "./loading/digital-loading.css";

export function BusinessLoading({ boot = false }: { boot?: boolean }) {
  const pathname = usePathname();
  if (pathname === "/attendance" || pathname.startsWith("/attendance/"))
    return boot ? null : <WorkforceLoadingScreen />;
  if (boot)
    return (
      <MglAppBootLoader
        className="business-digital-loader"
        label="MGL Business ачаалж байна"
        minimumVisibleMs={900}
      >
        <DigitalLoadingContent />
      </MglAppBootLoader>
    );
  return (
    <div
      className="business-digital-loader digital-route-loader"
      role="status"
      aria-label="MGL Business ачаалж байна"
      aria-live="polite"
      aria-busy="true"
    >
      <DigitalLoadingContent />
    </div>
  );
}
