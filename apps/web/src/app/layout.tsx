import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FloatingSideNav } from "@/components/organisms/layouts/FloatingSideNav";
import { Header, HEADER_HEIGHT } from "@/components/organisms/layouts/Header";
import { Footer } from "@/components/organisms/layouts/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MGL Store",
  description: "MGL Store — Official Website",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-slate-50 antialiased`}
        suppressHydrationWarning
      >
        <Header />
        <div className="h-[128px] shrink-0" />
        <main>{children}</main>
        <FloatingSideNav />
        <Footer />
      </body>
    </html>
  );
}
