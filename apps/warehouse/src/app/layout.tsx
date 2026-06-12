import type { Metadata } from "next";
import { MglAppBootLoader } from "@mgl/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "MGL WMS | Агуулахын удирдлагын систем",
  description: "Warehouse Management System — MGL Store Platform",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mn" className="antialiased">
      <body className="font-sans" suppressHydrationWarning>
        <MglAppBootLoader label="Агуулахын систем ачааллаж байна" />
        {children}
      </body>
    </html>
  );
}
