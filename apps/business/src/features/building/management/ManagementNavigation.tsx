"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  LayoutGrid,
  Users,
  FileText,
  Banknote,
  TriangleAlert,
  ChartNoAxesColumn,
  ContactRound,
  Settings,
  Mail,
  MessageSquare,
} from "lucide-react";
import { managementFetch } from "@/features/building/api/management-client";
const entries = [
  { label: "Хяналтын самбар", icon: LayoutDashboard, href: "/building/manage" },
  { label: "Төсөл ба Блок", icon: Building2, href: "/building/manage/content" },
  {
    label: "Байрны бүртгэл",
    icon: LayoutGrid,
    href: "/building/manage/inventory",
  },
  {
    label: "Худалдан авагчид",
    icon: Users,
    href: "/building/manage/customers",
  },
  {
    label: "Байр захиалах",
    icon: Building2,
    href: "/building/manage/purchases/new",
  },
  {
    label: "Ирсэн хүсэлтүүд",
    icon: MessageSquare,
    href: "/building/manage/inquiries",
  },
  { label: "Гэрээнүүд", icon: FileText, href: "/building/manage/purchases" },
  { label: "Төлөлт", icon: Banknote, href: "/building/manage/payments" },
  {
    label: "Хугацаа хэтэрсэн",
    icon: TriangleAlert,
    href: "/building/manage/overdue",
  },
  {
    label: "Сануулга илгээх",
    icon: Mail,
    href: "/building/manage/notifications",
  },
  {
    label: "Тайлан",
    icon: ChartNoAxesColumn,
    href: "/building/manage/reports",
  },
  { label: "Ажилтнууд & Эрх", icon: ContactRound, href: null },
  { label: "Тохиргоо", icon: Settings, href: null },
];
export function ManagementNavigation() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    const controller = new AbortController();
    const load = async () => {
      try {
        const r = await managementFetch("admin/navigation", {
          signal: controller.signal,
        });
        if (!r.ok) return;
        const data = (await r.json()) as { overdueCount: number };
        if (!controller.signal.aborted) setCount(data.overdueCount);
      } catch {
        /* Navigation remains usable if the count cannot load. */
      }
    };
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60000);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);
  return (
    <nav aria-label="Үндсэн удирдлагын цэс" className="erp-main-navigation">
      {entries.map(({ label, icon: Icon, href }) => {
        const active =
          href !== null &&
          (href.includes("#")
            ? pathname === "/building/manage" &&
              hash === href.slice(href.indexOf("#"))
            : href === "/building/manage"
              ? pathname === href && !hash
              : pathname === href ||
                (href.endsWith("/content") &&
                  /\/manage\/[^/]+\/(website|edit|plans)/.test(pathname)));
        const content = (
          <>
            <Icon size={21} />
            <span>{label}</span>
            {label === "Хугацаа хэтэрсэн" && count !== null && count > 0 && (
              <b className="erp-navigation-badge">{count}</b>
            )}
          </>
        );
        return href ? (
          <Link
            key={label}
            href={href}
            className={active ? "active" : ""}
            aria-current={active ? "page" : undefined}
            onClick={() =>
              setHash(href.includes("#") ? href.slice(href.indexOf("#")) : "")
            }
          >
            {content}
          </Link>
        ) : (
          <button
            key={label}
            type="button"
            aria-disabled="true"
            className="erp-navigation-pending"
            title="Энэ модуль хараахан холбогдоогүй"
          >
            {content}
            <small>Удахгүй</small>
          </button>
        );
      })}
    </nav>
  );
}
