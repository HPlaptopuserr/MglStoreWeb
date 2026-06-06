import { ReactNode } from "react";

export const metadata = {
  title: "Гэрээ баталгаажуулах | MGL Store",
  description: "Монгол эзэнтэй ЖДБ эрхлэгчдийн нэгдсэн холбооны гишүүнчлэлийн гэрээ",
  icons: { icon: "/logo.png" },
};

export default function ContractLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
