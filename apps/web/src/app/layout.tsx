import { ReactNode } from "react";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { FloatingSideNav } from "@/components/organisms/layouts/FloatingSideNav";
import { Header } from "@/components/organisms/layouts/Header";
import { Footer } from "@/components/organisms/layouts/Footer";
import { SmoothScrollProvider } from "@/components/organisms/layouts/SmoothScrollProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
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
        className={`${inter.variable} ${manrope.variable} bg-white antialiased min-h-screen flex flex-col`}
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
