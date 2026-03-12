import { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FloatingSideNav } from "@/components/organisms/layouts/FloatingSideNav";
import { Header } from "@/components/organisms/layouts/Header";
import { Footer } from "@/components/organisms/layouts/Footer";
import { SmoothScrollProvider } from "@/components/organisms/layouts/SmoothScrollProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "MGL Store",
  description: "Монгол мөнгө Монголдоо",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="mn">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-slate-50 antialiased min-h-screen flex flex-col`}
        suppressHydrationWarning
      >
        <SmoothScrollProvider>
          <Header />
          <main className="grow pt-32">{children}</main>
          <FloatingSideNav />
          <Footer />
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
