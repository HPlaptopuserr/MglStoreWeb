import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MGL Store — Admin",
  description: "MGL Store Admin Portal",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="mn">
      <body>{children}</body>
    </html>
  );
}
