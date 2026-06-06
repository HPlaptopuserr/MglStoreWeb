import { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/organisms/layouts/AppShell";

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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
