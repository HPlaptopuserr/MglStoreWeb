import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MGL Store — Admin",
  description: "MGL Store Admin Portal",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="mn">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
