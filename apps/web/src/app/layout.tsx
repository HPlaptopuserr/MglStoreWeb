import { ReactNode } from "react";
import "./globals.css";
import { Header } from "@/components/organisms/layouts/Header";
import { Footer } from "@/components/organisms/layouts/Footer";
import { SmoothScrollProvider } from "@/components/organisms/layouts/SmoothScrollProvider";
import { AuthProvider } from "@/lib/auth-context";
import { ChatBot } from "@/components/organisms/ChatBot";

export const metadata = {
  title: "MGL Store",
  description: "Монгол мөнгө Монголдоо",
  icons: {
    icon: "/logo.png",
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
        <AuthProvider>
        <SmoothScrollProvider>
          <Header />
          <main className="grow pt-40 pb-20 md:pt-32 md:pb-0">{children}</main>
          <ChatBot />
          <Footer />
        </SmoothScrollProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
