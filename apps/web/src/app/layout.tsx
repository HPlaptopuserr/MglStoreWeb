import { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/organisms/layouts/AppShell";
import { MglAppBootLoader } from "@mgl/ui";

const SITE_URL = "https://mglstore.mn";
const SOCIAL_LOGO_IMAGE = "/social/mglstore-og.jpg";
const SITE_ICON_IMAGE = "/icon-512.png";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "MGL Store",
  description: "Монгол мөнгө Монголдоо",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
      { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: SITE_ICON_IMAGE, sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
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

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "MGL Store",
      url: SITE_URL,
      logo: `${SITE_URL}${SITE_ICON_IMAGE}`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "MGL Store",
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
