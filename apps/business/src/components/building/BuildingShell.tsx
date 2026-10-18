"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
export function BuildingShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  if (
    path.startsWith("/building/manage") ||
    path === "/building/demo" ||
    path === "/building" ||
    path.startsWith("/building/projects/") ||
    path.endsWith("/preview")
  )
    return <div className="building-app">{children}</div>;
  const managing = path.startsWith("/building/manage");
  return (
    <div className="building-app">
      <header className="building-topbar">
        <Link href="/building" className="building-brand">
          <span className="brand-symbol">
            <Building2 size={21} />
          </span>
          <span>
            MGL <b>Business</b>
            <small>БАРИЛГА · ҮЛ ХӨДЛӨХ</small>
          </span>
        </Link>
        <nav aria-label="Үндсэн навигаци">
          <Link href="/building" className={!managing ? "nav-active" : ""}>
            Төслүүд
          </Link>
          <Link href="/building/manage" className="building-nav-cta">
            Удирдлага <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>
      {children}
      <footer className="building-footer">
        <span>MGL Business</span>
        <span>Итгэлтэй сонголт. Үнэ цэнтэй орон зай.</span>
      </footer>
    </div>
  );
}
