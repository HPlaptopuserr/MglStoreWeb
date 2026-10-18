"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronRight,
  Clock3,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { sections, type WorkforceSection } from "./navigation";
import { useWorkforce } from "./useWorkforce";
import { Loading, Empty } from "./components/shared";
import { OverviewView } from "./views/OverviewView";
import { WorkReportsView } from "./views/WorkReportsView";
import { ReportsView } from "./views/ReportsView";
import { RequestsView } from "./views/RequestsView";
import { EmployeesView } from "./views/EmployeesView";
import { DepartmentsView } from "./views/DepartmentsView";
import { SchedulesView } from "./views/SchedulesView";
import { LocationsView } from "./views/LocationsView";
import { NotificationsView } from "./views/NotificationsView";
import { AnalyticsView } from "./views/AnalyticsView";
import { SettingsView } from "./views/SettingsView";
import { IntegrationsView } from "./views/IntegrationsView";
import { AddonViews } from "./views/AddonViews";
import { BillingView } from "./views/BillingView";
import "./workforce.css";
const views = {
  overview: OverviewView,
  reports: ReportsView,
  "work-reports": WorkReportsView,
  requests: RequestsView,
  employees: EmployeesView,
  departments: DepartmentsView,
  schedules: SchedulesView,
  locations: LocationsView,
  notifications: NotificationsView,
  analytics: AnalyticsView,
  settings: SettingsView,
  integrations: IntegrationsView,
  billing: BillingView,
  market: BillingView,
  tracking: AddonViews,
  mail: AddonViews,
};
export function WorkforceApp({ section }: { section: WorkforceSection }) {
  const controller = useWorkforce(),
    { data, loading, error, range, setRange, refresh, toast, setToast } =
      controller;
  const router = useRouter(),
    [menu, setMenu] = useState(false),
    [search, setSearch] = useState("");
  const current = sections.find((s) => s.id === section)!;
  const View = views[section];
  const href = (id: WorkforceSection) =>
    `/attendance/${id}${data ? `?organizationId=${encodeURIComponent(data.organization.id)}` : ""}`;
  async function logout() {
    const response = await fetch("/api/workforce-session", {
      method: "DELETE",
    });
    if (response.ok) {
      router.replace("/attendance/login");
      router.refresh();
    } else setToast("Гарах үед алдаа гарлаа. Дахин оролдоно уу");
  }
  return (
    <div className="wf wf-app">
      <a className="wf-skip" href="#wf-main">
        Үндсэн хэсэг рүү
      </a>
      <aside className={`wf-sidebar ${menu ? "is-open" : ""}`}>
        <div className="wf-brand">
          <Clock3 />
          <Link href="/">
            MGL<span>Business</span>
          </Link>
          <button
            className="wf-mobile-close"
            aria-label="Цэс хаах"
            onClick={() => setMenu(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="wf-org-card">
          <span className="wf-org-icon">
            {data?.organization.name.slice(0, 1) || "M"}
          </span>
          <strong>{data?.organization.name || "Цаг удирдлага"}</strong>
          <span className="wf-badge">
            {data?.subscription.planName ?? "Байгууллага"}
          </span>
          <div>
            <span>Ажилтны тоо</span>
            <b>
              {data?.organization.activeMembers ?? "—"} /{" "}
              {data?.organization.maxMembers ?? "—"}
            </b>
          </div>
          <progress
            max={data?.organization.maxMembers ?? 1}
            value={data?.organization.activeMembers ?? 0}
          />
          <div>
            <span>Гэрээ дуусах</span>
            <b>
              {data?.subscription.expiresAt?.slice(0, 10) ?? "Тохируулаагүй"}
            </b>
          </div>
        </div>
        <nav aria-label="Цаг удирдлага">
          {sections
            .filter(
              (s) => !s.addon || data?.subscription.addons.includes(s.addon),
            )
            .filter((s) => s.label.toLowerCase().includes(search.toLowerCase()))
            .map(({ id, label, icon: Icon, feature }) => (
              <Link
                href={href(id)}
                key={id}
                onClick={() => setMenu(false)}
                className={section === id ? "active" : ""}
                aria-current={section === id ? "page" : undefined}
              >
                <Icon size={18} />
                <span>{label}</span>
                {id === "requests" &&
                  Boolean(data?.summary.pendingRequests) && (
                    <b className="wf-count">{data?.summary.pendingRequests}</b>
                  )}
                {feature && data && !data.policy.features[feature] && (
                  <ShieldCheck size={13} />
                )}
              </Link>
            ))}
        </nav>
        <div className="wf-sidebar-foot">
          <Link href="/">MGL Business танилцуулга ↗</Link>
          <button onClick={() => void logout()}>
            <LogOut size={16} /> Гарах
          </button>
        </div>
      </aside>
      {menu && (
        <button
          className="wf-overlay"
          aria-label="Цэс хаах"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="wf-content">
        <header className="wf-topbar">
          <button
            className="wf-menu"
            onClick={() => setMenu(true)}
            aria-label="Цэс нээх"
          >
            <Menu size={20} />
          </button>
          <label className="wf-search">
            <Search size={17} />
            <input
              aria-label="Цэс хайх"
              placeholder="Цэс хайх…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="wf-topbar-right">
            {data && (
              <select
                aria-label="Байгууллага солих"
                value={data.organization.id}
                onChange={(e) =>
                  router.push(
                    `/attendance/${section}?organizationId=${encodeURIComponent(e.target.value)}`,
                  )
                }
              >
                {data.session.organizations.map((org) => (
                  <option value={org.id} key={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            )}
            <Link href={href("notifications")} aria-label="Мэдэгдэл">
              <Bell size={19} />
            </Link>
            <span className="wf-user-name">{data?.session.name}</span>
          </div>
        </header>
        <main id="wf-main" className={`wf-main wf-page-${section}`}>
          <div className="wf-breadcrumb">
            <Link href={href("overview")}>Цаг удирдлага</Link>
            <ChevronRight size={13} />
            <span>{current.label}</span>
          </div>
          <div className="wf-page-heading">
            <div>
              <p className="wf-kicker">MGL BUSINESS / WORKFORCE</p>
              <h1>{current.label}</h1>
            </div>
            <div className="wf-range">
              <label>
                Эхлэх огноо
                <input
                  type="date"
                  value={range.from}
                  max={range.to}
                  onChange={(e) => {
                    if (e.target.value)
                      setRange((v) => ({ ...v, from: e.target.value }));
                  }}
                />
              </label>
              <span>→</span>
              <label>
                Дуусах огноо
                <input
                  type="date"
                  value={range.to}
                  min={range.from}
                  onChange={(e) => {
                    if (e.target.value)
                      setRange((v) => ({ ...v, to: e.target.value }));
                  }}
                />
              </label>
              <button
                onClick={refresh}
                disabled={loading}
                aria-label="Мэдээлэл шинэчлэх"
              >
                <RefreshCw size={17} className={loading ? "wf-spin" : ""} />
              </button>
            </div>
          </div>
          {toast && (
            <div className="wf-toast" role="status">
              {toast}
              <button onClick={() => setToast("")} aria-label="Мэдэгдэл хаах">
                <X size={16} />
              </button>
            </div>
          )}
          {error && (
            <div className="wf-error" role="alert">
              <p>{error}</p>
              <button onClick={refresh}>Дахин оролдох</button>
            </div>
          )}
          {!data ? (
            loading ? (
              <Loading />
            ) : null
          ) : (current.feature && !data.policy.features[current.feature]) ||
            (current.addon &&
              !data.subscription.addons.includes(current.addon)) ? (
            <Empty
              title="Энэ боломж идэвхгүй байна"
              description="Байгууллагын App Control болон багцын тохиргооноос идэвхжүүлнэ."
              action={
                <Link href={href("billing")}>Багцын мэдээлэл харах →</Link>
              }
            />
          ) : (
            <View controller={controller} section={section} />
          )}
        </main>
      </div>
    </div>
  );
}
