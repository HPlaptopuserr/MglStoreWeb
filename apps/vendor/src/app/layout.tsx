import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "MGL Store | The Unified Retail Network of Mongolia",
  description:
    "Connecting Mongolian businesses into one modern retail ecosystem.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body
        className="font-sans bg-gray-50 text-gray-900"
        suppressHydrationWarning
      >
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
