import type { Metadata } from "next";
import { MglAppBootLoader } from "@mgl/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "MGL Store Org",
  description: "MGL Store байгууллагын удирдлагын самбар.",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn" className="antialiased">
      <body
        className="font-sans bg-gray-50 text-gray-900"
        suppressHydrationWarning
      >
        <MglAppBootLoader label="Байгууллагын portal ачааллаж байна" />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
