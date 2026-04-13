import { ReactNode } from "react";
import { Inter, Manrope, Marck_Script } from "next/font/google";
import "./globals.css";
import { FloatingSideNav } from "@/components/organisms/layouts/FloatingSideNav";
import { Header } from "@/components/organisms/layouts/Header";
import { Footer } from "@/components/organisms/layouts/Footer";
import { SmoothScrollProvider } from "@/components/organisms/layouts/SmoothScrollProvider";
import { AuthProvider } from "@/lib/auth-context";
import { ChatBot } from "@/components/organisms/ChatBot";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

const marckScript = Marck_Script({
  variable: "--font-marck-script",
  weight: "400",
  subsets: ["latin", "cyrillic"],
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
        className={`${inter.variable} ${manrope.variable} ${marckScript.variable} bg-white antialiased min-h-screen flex flex-col`}
        suppressHydrationWarning
      >
        <AuthProvider>
        <SmoothScrollProvider>
          <Header />
          <main className="grow pt-40 md:pt-32">{children}</main>
          <FloatingSideNav />
          <ChatBot />
          <Footer />
        </SmoothScrollProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
