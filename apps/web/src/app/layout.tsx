"use client";

import { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FloatingSideNav } from "@/components/organisms/layouts/FloatingSideNav";
import { Header } from "@/components/organisms/layouts/Header";
import { Footer } from "@/components/organisms/layouts/Footer";
import { ReactLenis } from "@studio-freight/react-lenis";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="mn">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-slate-50 antialiased min-h-screen flex flex-col`}
        suppressHydrationWarning
      >
        <ReactLenis
          root
          options={{
            lerp: 0.1,
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 1,
          }}
        >
          <Header />
          <main className="grow pt-32">{children}</main>
          <FloatingSideNav />
          <Footer />
        </ReactLenis>
      </body>
    </html>
  );
}
