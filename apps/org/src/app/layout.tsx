import type { Metadata } from "next";
import { MglAppBootLoader } from "@mgl/ui";
import "./globals.css";

const legacyBrowserStyles = `
(function () {
  var match = navigator.userAgent.match(/(?:Chrome|Chromium|CriOS|EdgA)\\/(\\d+)/);
  if (!match || parseInt(match[1], 10) >= 111) return;

  var stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = "/legacy.css?v=1";
  document.head.appendChild(stylesheet);
})();
`;

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
      <head>
        <script dangerouslySetInnerHTML={{ __html: legacyBrowserStyles }} />
      </head>
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
