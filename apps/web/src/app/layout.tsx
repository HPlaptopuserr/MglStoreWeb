import { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/organisms/layouts/AppShell";
import { MglAppBootLoader } from "@mgl/ui";

const SITE_URL = "https://mglstore.mn";
const SOCIAL_LOGO_IMAGE = "/social/mglstore-og.jpg";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "MGL Store",
  description: "Монгол мөнгө Монголдоо",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    siteName: "MGL Store",
    title: "MGL Store",
    description: "Монгол мөнгө Монголдоо",
    url: SITE_URL,
    images: [
      {
        url: SOCIAL_LOGO_IMAGE,
        width: 1200,
        height: 630,
        alt: "MGL Store logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MGL Store",
    description: "Монгол мөнгө Монголдоо",
    images: [SOCIAL_LOGO_IMAGE],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="mn">
      <body
        className="bg-white antialiased min-h-screen flex flex-col"
        suppressHydrationWarning
      >
        <MglAppBootLoader label="Дэлгүүрийг ачааллаж байна" />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
