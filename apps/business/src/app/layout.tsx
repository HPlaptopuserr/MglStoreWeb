import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { BusinessLoading } from "@/components/BusinessLoading";
import "./globals.css";

const SITE_URL = "https://mglbusiness.mn";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MGL Business",
    template: "%s | MGL Business",
  },
  description:
    "Багийн ирц, даалгавар, борлуулалт, POS, бараа таталт, захиалга, хүргэлт — бизнесийн өдөр тутмын ажил нэг апп дотор.",
  openGraph: {
    type: "website",
    siteName: "MGL Business",
    title: "MGL Business",
    description:
      "MGL Business: ажилтан, цаг бүртгэл, борлуулалт, бараа, хүргэлтийн нэгдсэн ажлын орчин.",
    url: SITE_URL,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#11131c",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="mn">
      <body suppressHydrationWarning>
        <BusinessLoading boot />
        {children}
      </body>
    </html>
  );
}
