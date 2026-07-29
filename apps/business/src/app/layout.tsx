import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { MglAppBootLoader } from "@mgl/ui";
import "./globals.css";

const SITE_URL = "https://business.mglstore.mn";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MGL Business",
    template: "%s | MGL Business",
  },
  description:
    "Монгол бизнесүүдэд зориулсан байгууллагын танилцуулга, ажлын зар, сургалт, контентын платформ.",
  openGraph: {
    type: "website",
    siteName: "MGL Business",
    title: "MGL Business",
    description:
      "Байгууллага, ажлын зар, сургалт, бизнес контентыг нэг экосистемд.",
    url: SITE_URL,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="mn">
      <body suppressHydrationWarning>
        <MglAppBootLoader label="MGL Business ачааллаж байна" />
        {children}
      </body>
    </html>
  );
}
