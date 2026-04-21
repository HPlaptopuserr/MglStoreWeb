import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "MGL Store | Монголын худалдааны нэгдсэн сүлжээ",
  description:
    "Монголын бизнесүүдийг орчин үеийн жижиглэн худалдааны нэг экосистемд холбох.",
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
