"use client";
import { CollectionMetrics } from "./CollectionMetrics";
import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Plus, Download } from "lucide-react";
import { managementFetch, responseError } from "@/features/building/api/management-client";
import { useBuildingProjects } from "../management/useBuildingProjects";
import { CashFlowSummary } from "./CashFlowSummary";
import { ProjectHighlights } from "./ProjectHighlights";
import { FinanceSummary } from "./FinanceSummary";
import { OverdueTable } from "./OverdueTable";
import { type DashboardData, percentage } from "./model";
import "./dashboard.css";
export function ManagementDashboard() {
  const { projects } = useBuildingProjects(true);
  const [project, setProject] = useState(""),
    [data, setData] = useState<DashboardData | null>(null),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    void managementFetch(
      `admin/dashboard${project ? `?project=${encodeURIComponent(project)}` : ""}`,
      { signal: controller.signal },
    )
      .then(async (r) => {
        if (!r.ok)
          throw new Error(await responseError(r, "Самбар ачаалж чадсангүй"));
        return r.json() as Promise<DashboardData>;
      })
      .then((d) => {
        if (!controller.signal.aborted) setData(d);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Алдаа гарлаа");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [project, refresh]);
  function reload() {
    setLoading(true);
    setError("");
    setRefresh((value) => value + 1);
  }
  function selectProject(value: string) {
    setLoading(true);
    setError("");
    setProject(value);
  }
  function exportReport() {
    if (!data) return;
    const rows = [
      ["Блок", "Нийт нэгж", "Зарагдсан", "Боломжтой"],
      ...data.blocks.map((b) => [b.name, b.total, b.sold, b.available]),
    ];
    const csv =
      "\ufeff" +
      rows
        .map((row) =>
          row
            .map(
              (v) =>
                '"' +
                String(v)
                  .replace(/^[=+@-]/, "'$&")
                  .replaceAll('"', '""') +
                '"',
            )
            .join(","),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "building-sales.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="erp-dashboard erp-reference-dashboard">
      <header className="erp-section-heading">
        <div>
          <p className="erp-eyebrow">ҮЛ ХӨДЛӨХ ХӨРӨНГИЙН УДИРДЛАГА</p>
          <h1>
            {project
              ? projects.find((item) => item.id === project)?.title
              : "Бүх төслийн хяналтын самбар"}
          </h1>
          <select
            aria-label="Төслөөр шүүх"
            value={project}
            onChange={(e) => selectProject(e.target.value)}
          >
            <option value="">Бүх төсөл</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <div className="erp-actions">
          <button
            onClick={() => reload()}
            disabled={loading}
            aria-label="Мэдээлэл шинэчлэх"
          >
            <RefreshCw size={16} />
          </button>
          <button disabled={!data || loading || !!error} onClick={exportReport}>
            <Download size={16} />
            CSV татах
          </button>
          <button onClick={() => window.print()} disabled={loading || !!error}>
            PDF / Хэвлэх
          </button>
          <Link href="/building/manage/new">
            <Plus size={16} />
            Шинэ төсөл
          </Link>
        </div>
      </header>
      {loading ? (
        <div className="erp-empty" role="status">
          Хяналтын мэдээлэл ачаалж байна…
        </div>
      ) : error ? (
        <div className="erp-empty" role="alert">
          {error}
          <button onClick={() => reload()}>Дахин оролдох</button>
        </div>
      ) : (
        data && (
          <>
            <p className="erp-note">
              Шинэчилсэн:{" "}
              {new Date(data.updatedAt).toLocaleString("mn-MN", {
                timeZone: "Asia/Ulaanbaatar",
              })}{" "}
              · Улаанбаатар (UTC+8)
            </p>
            <CollectionMetrics data={data} />
            <div className="erp-reference-finance">
            <FinanceSummary
              finance={data.finance}
              overdueContracts={
                new Set(data.overdue.map((row) => row.reference)).size
              }
            />
              <CashFlowSummary finance={data.finance} />
            </div>
            <OverdueTable rows={data.overdue} />
            <div className="erp-performance-layout">
              <section className="erp-card" id="blocks">
                <div className="erp-section-heading">
                  <div>
                    <p className="erp-eyebrow">БОРЛУУЛАЛТЫН ЯВЦ</p>
                    <h2>Блок бүрийн борлуулалтын явц</h2>
                  </div>
                  <Link href="/building/manage/content">
                    Төсөл, блок удирдах →
                  </Link>
                </div>
                <div className="erp-block-grid">
                  {data.blocks.map((b) => (
                    <Link
                      className="erp-block"
                      key={b.id}
                      href={`/building/manage/${b.projectId}/website`}
                    >
                      <h3>
                        {b.name}
                        <small>{percentage(b.sold, b.total).toFixed(1)}%</small>
                      </h3>
                      <p>
                        {b.projectTitle} · {b.floors} давхар
                      </p>
                      <strong>
                        {b.sold} / {b.total} зарагдсан
                      </strong>
                      <progress max={100} value={percentage(b.sold, b.total)} />
                      <span>Боломжтой: {b.available}</span>
                      <p>Ажилтны хуваарилалтын мэдээлэл холбогдоогүй</p>
                    </Link>
                  ))}
                </div>
                {!data.blocks.length && (
                  <div className="erp-empty">
                    Блок бүртгэгдээгүй байна.{" "}
                    <Link href="/building/manage/new">
                      Эхний төслөө нэмэх →
                    </Link>
                  </div>
                )}
              </section>
            </div>
            <details className="erp-inventory-disclosure"><summary>Байрны нөөц ба төлөвийн дэлгэрэнгүй</summary>            <h2>Нэгжийн нөөц & төлөв байдал</h2>
            <div className="erp-inventory-grid">
              {[
                [
                  "Нийт нэгж",
                  Object.values(data.totals).reduce((s, n) => s + n, 0),
                ],
                ["Борлуулах боломжтой", data.totals.AVAILABLE ?? 0],
                ["Түр захиалсан", data.totals.RESERVED ?? 0],
                ["Гэрээтэй / зарагдсан", data.totals.SOLD ?? 0],

                ["Түр түдгэлзүүлсэн", data.totals.HOLD ?? 0],
              ].map(([label, value]) => (
                <article className="erp-card" key={label}>
                  <span>{label}</span>
                  <strong className="erp-value">{value}</strong>
                  <small>
                    Нийт дүнд:{" "}
                    {percentage(
                      Number(value),
                      Object.values(data.totals).reduce((s, n) => s + n, 0),
                    ).toFixed(1)}
                    %
                  </small>
                </article>
              ))}
            </div>
            <p className="erp-note">
              Орон сууц, үйлчилгээ, гарааш, зогсоол багтсан. Гэрээ байгуулах
              шатанд: {data.totals.CONTRACT_PENDING ?? 0}. Цуцлагдсан:{" "}
              {data.totals.CANCELLED ?? 0}.
            </p>
</details>
            {(project || projects[0]?.id) && (
              <ProjectHighlights
                key={project || projects[0].id}
                projectId={project || projects[0].id}
              />
            )}
          </>
        )
      )}
    </div>
  );
}
