import type { Metadata } from "next";
import { MglAppBootLoader } from "@mgl/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "MGL POS | Касс систем",
  description:
    "MGL Store vendor байгууллагуудад зориулсан тусдаа POS касс систем.",
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
    <html lang="en" className="antialiased">
      <body
        className="font-sans bg-gray-50 text-gray-900"
        suppressHydrationWarning
      >
        <MglAppBootLoader label="POS касс ачааллаж байна" />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
