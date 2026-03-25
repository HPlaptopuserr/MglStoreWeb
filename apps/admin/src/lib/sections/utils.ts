import type { RefObject } from "react";
import { PRINT_SCALE, PRINT_COPIES } from "./constants";

export async function getLeafletLib() {
  const leafletModule: any = await import("leaflet");
  return leafletModule?.default ?? leafletModule;
}

export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

export function normalizeText(value: string): string {
  return value.toLowerCase().trim();
}

export function buildBackPrintOrder(total: number, columns: number): number[] {
  const order: number[] = [];
  for (let i = 0; i < total; i += columns) {
    const row = Array.from({ length: columns }, (_, idx) => i + idx).filter(
      (idx) => idx < total,
    );
    order.push(...row.reverse());
  }
  return order;
}

export function detectWebBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_WEB_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim();

  if (typeof window === "undefined") return "https://mglstore.mn";

  const { protocol, hostname } = window.location;
  const host = hostname.toLowerCase();

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:3000";
  }
  if (host === "mgl-admin.onrender.com" || host === "mgl-vendor.onrender.com") {
    return "https://mgl-web-n7wg.onrender.com";
  }
  if (host.startsWith("admin.") || host.startsWith("vendor.")) {
    const rootHost = host.split(".").slice(1).join(".");
    return `${protocol}//${rootHost}`;
  }

  return `${protocol}//${host}`;
}

export function runPrint(printAreaRef: RefObject<HTMLDivElement | null>): void {
  if (!printAreaRef.current) return;

  const existingRuntime = document.getElementById("card-print-area-runtime");
  if (existingRuntime) existingRuntime.remove();

  const existingStyle = document.getElementById("card-print-override");
  if (existingStyle) existingStyle.remove();

  const runtimeRoot = printAreaRef.current.cloneNode(true) as HTMLDivElement;
  runtimeRoot.id = "card-print-area-runtime";
  runtimeRoot.style.display = "block";
  document.body.appendChild(runtimeRoot);

  const style = document.createElement("style");
  style.id = "card-print-override";
  style.textContent = `
    #card-print-area-runtime {
      position: fixed !important;
      left: -99999px !important;
      top: 0 !important;
      width: 0 !important;
      height: 0 !important;
      overflow: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }

    @media print {
      @page { size: A4 portrait; margin: 6mm; }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body > *:not(#card-print-area-runtime) {
        display: none !important;
      }
      #card-print-area-runtime,
      #card-print-area-runtime * {
        visibility: visible !important;
      }
      #card-print-area-runtime {
        position: static !important;
        width: 100% !important;
        min-height: auto !important;
        display: block !important;
        background: white !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      #card-print-area-runtime .print-page {
        min-height: auto !important;
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 6mm 5mm !important;
        align-content: start !important;
        justify-items: center !important;
        justify-content: center !important;
        padding: 0 !important;
      }

      #card-print-area-runtime .print-page-front {
        break-after: page !important;
        page-break-after: always !important;
      }

      #card-print-area-runtime .print-card-slot {
        width: ${420 * PRINT_SCALE}px !important;
        height: ${240 * PRINT_SCALE}px !important;
        overflow: hidden !important;
        display: flex !important;
        align-items: flex-start !important;
        justify-content: center !important;
      }

      #card-print-area-runtime .print-card-slot > * {
        transform: scale(${PRINT_SCALE}) !important;
        transform-origin: top center !important;
      }
    }
  `;
  document.head.appendChild(style);

  const cleanup = () => {
    document.getElementById("card-print-override")?.remove();
    document.getElementById("card-print-area-runtime")?.remove();
  };

  window.addEventListener("afterprint", cleanup, { once: true });
  window.print();
}
