import { ReactNode } from "react";
import "../globals.css";

export const metadata = {
  title: "Гэрээ баталгаажуулах | MGL Store",
  description: "Монгол эзэнтэй ЖДБ эрхлэгчдийн нэгдсэн холбооны гишүүнчлэлийн гэрээ",
  icons: { icon: "/logo.png" },
};

export default function ContractLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="mn">
      <body className="bg-neutral-100 antialiased min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
