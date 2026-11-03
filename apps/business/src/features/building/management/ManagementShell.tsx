"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  LogOut,
  Building2,
  ShieldCheck,
  ChevronRight,
  Plus,
  PenTool,
} from "lucide-react";
import { ManagementNavigation } from "./ManagementNavigation";
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
        <p className="sidebar-label">ҮНДСЭН ЦЭС</p>
        <ManagementNavigation />
        <details className="erp-sidebar-tools">
          <summary>Нэмэлт хэрэгслүүд</summary>
          <Link href="/building/manage/new">
            <Plus size={16} />
            Шинэ төсөл
          </Link>
          <Link href="/building/manage/plans">
            <PenTool size={16} />
            План засварлагч
          </Link>
          <Link href="/building/demo" target="_blank">
            <ArrowUpRight size={16} />
            Хэрэглэгчийн жишээ
          </Link>
        </details>
        <div className="workspace-note">
          <ShieldCheck size={22} />
          <strong>Төслөөс борлуулалт хүртэл.</strong>
          <p>
            Төслөө сонгоод мэдээлэл, байрны төлөв, давхрын планыг нэг дор
            удирдаарай.
          </p>
        </div>
        <Link className="workspace-logout" href="/account/password?context=building&mode=change">Нууц үг солих</Link>
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
                : pathname.endsWith("/payments")
                  ? "Төлөлт"
                  : pathname.endsWith("/overdue")
                    ? "Хугацаа хэтэрсэн"
                    : pathname.endsWith("/reports")
                      ? "Тайлан"
                      : pathname.endsWith("/notifications")
                        ? "Сануулга"
                        : pathname.endsWith("/purchases/new")
                          ? "Байр захиалах"
                          : pathname.endsWith("/purchases")
                            ? "Гэрээнүүд"
                            : pathname.endsWith("/customers")
                              ? "Худалдан авагчид"
                              : pathname.endsWith("/inventory")
                                ? "Байрны бүртгэл"
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
