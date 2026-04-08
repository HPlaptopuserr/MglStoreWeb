import { ReactNode } from "react";

export const metadata = {
  title: "MGL Store - Маягт",
  description: "MGL Store маягт бөглөх",
};

export default function ApplyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[60vh] py-8 px-4 md:px-6">{children}</div>
  );
}
