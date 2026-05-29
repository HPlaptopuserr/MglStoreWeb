import { ReactNode } from "react";
import "../globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata = {
  title: "Гэрээ баталгаажуулах | MGL Store",
  description: "Монгол эзэнтэй ЖДБ эрхлэгчдийн нэгдсэн холбооны гишүүнчлэлийн гэрээ",
  icons: { icon: "/logo.png" },
};

export default function ContractLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="mn">
      <body className="bg-neutral-100 antialiased min-h-screen" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
