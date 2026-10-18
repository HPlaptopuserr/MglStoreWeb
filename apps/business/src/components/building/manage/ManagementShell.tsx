"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  LayoutGrid,
  BarChart3,
  Wallet,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  LogOut,
  Building2,
  ShieldCheck,
  ChevronRight,
  PenTool,
} from "lucide-react";
import "./management-workspace.css";
export function ManagementShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);
  async function logout() {
    setLeaving(true);
    setError("");
    try {
      const r = await fetch("/api/building-session", { method: "DELETE" });
      if (!r.ok) throw new Error();
      router.replace("/building/login");
      router.refresh();
    } catch {
      setError("Гарч чадсангүй. Дахин оролдоно уу.");
      setLeaving(false);
    }
  }
  if (pathname.endsWith("/preview")) return <>{children}</>;
  return (
    <div className="management-layout">
      <aside className="management-sidebar">
        <div className="workspace-label">
          <span>
            <Building2 size={20} />
          </span>
          <div>
            <strong>MGL PROPERTY ERP</strong>
            <small>УДИРДЛАГЫН СИСТЕМ</small>
          </div>
        </div>
        <p className="sidebar-label">АЖЛЫН ОРЧИН</p>
        <nav aria-label="Удирдлагын цэс">
          <Link
            href="/building/manage"
            className={pathname === "/building/manage" ? "active" : ""}
            aria-current={pathname === "/building/manage" ? "page" : undefined}
          >
            <BarChart3 size={18} />
            Хяналтын самбар
          </Link>
          <Link
            href="/building/manage/content"
            className={
              pathname !== "/building/manage" &&
              !pathname.endsWith("/new") &&
              pathname !== "/building/manage/plans"
                ? "active"
                : ""
            }
            aria-current={
              pathname !== "/building/manage" &&
              !pathname.endsWith("/new") &&
              pathname !== "/building/manage/plans"
                ? "page"
                : undefined
            }
          >
            <LayoutGrid size={18} />
            Төсөл ба блок
          </Link>
          <Link
            href="/building/manage/new"
            className={pathname.endsWith("/new") ? "active" : ""}
            aria-current={pathname.endsWith("/new") ? "page" : undefined}
          >
            <Plus size={18} />
            Шинэ төсөл
          </Link>
          <Link href="/building/manage#finance">
            <Wallet size={18} />
            Төлөлтийн тойм
          </Link>
          <Link href="/building/manage#overdue">
            <AlertTriangle size={18} />
            Хугацаа хэтэрсэн
          </Link>
          <p className="sidebar-label">ТУСЛАХ ОРЧИН</p>
          <Link
            href="/building/manage/plans"
            className={pathname === "/building/manage/plans" ? "active" : ""}
          >
            <PenTool size={18} />
            План зурах туршилт
          </Link>
          <Link href="/building/demo" target="_blank">
            <ArrowUpRight size={18} />
            Хэрэглэгчийн жишээ
          </Link>
        </nav>
        <div className="workspace-note">
          <ShieldCheck size={22} />
          <strong>Төслөөс борлуулалт хүртэл.</strong>
          <p>
            Төслөө сонгоод мэдээлэл, байрны төлөв, давхрын планыг нэг дор
            удирдаарай.
          </p>
        </div>
        <button
          className="workspace-logout"
          disabled={leaving}
          onClick={logout}
        >
          <LogOut size={17} />
          {leaving ? "Гарч байна…" : "Гарах"}
        </button>
        {error && <p role="alert">{error}</p>}
      </aside>
      <div className="management-workspace">
        <header className="management-topbar">
          <nav aria-label="Хуудасны зам">
            <Link href="/building/manage/content">Ажлын орчин</Link>
            <ChevronRight size={14} />
            <span>
              {pathname === "/building/manage"
                ? "Хяналтын самбар"
                : pathname.endsWith("/new")
                  ? "Шинэ төсөл"
                  : pathname.includes("/plans")
                    ? "План засварлагч"
                    : pathname.endsWith("/website")
                      ? "Төсөл удирдах"
                      : pathname.endsWith("/edit")
                        ? "Бүтэц засах"
                        : "Төслүүд"}
            </span>
          </nav>
          <Link href="/building" target="_blank">
            Нийтийн сайт <ArrowUpRight size={15} />
          </Link>
        </header>
        <main className="management-main">{children}</main>
      </div>
    </div>
  );
}
