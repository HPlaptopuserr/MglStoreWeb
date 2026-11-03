"use client";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Activity, CalendarDays, ChartColumn, Clock3 } from "lucide-react";
import type { WorkforceSnapshot } from "@mgl/types";
import { summarize } from "./model";
import {
  PerformancePanel,
  RiskPanel,
  TimeBreakdown,
} from "./PerformancePanels";
import { AttendanceMatrix, WeekdayPanel } from "./AttendanceMatrix";
import { Stats, minutes } from "../components/shared";
export function AttendanceInsights({
  data,
  onRange,
}: {
  data: WorkforceSnapshot;
  onRange: (range: { from: string; to: string }) => void;
}) {
  const router = useRouter(),
    pathname = usePathname(),
    search = useSearchParams();
  const selected = search.get("insight");
  const view = ["overview", "matrix", "risk", "weekday", "time"].includes(
    selected ?? "",
  )
    ? selected
    : "overview";
  function setView(value: string) {
    const params = new URLSearchParams(search.toString());
    params.set("insight", value);
    router.replace(`${pathname}?${params}`, { scroll: false });
  }
  const [department, setDepartment] = useState(""),
    [risk, setRisk] = useState<"late" | "early" | "absent">("late");
  const rows = useMemo(
    () =>
      data.rows.filter(
        (r) => !department || (r.department || "Хэлтэсгүй") === department,
      ),
    [data.rows, department],
  );
  const employeeMetrics = useMemo(() => summarize(rows, "employee"), [rows]),
    departmentMetrics = useMemo(() => summarize(rows, "department"), [rows]);
  const totals = employeeMetrics.reduce(
    (s, m) => ({
      planned: s.planned + m.planned,
      worked: s.worked + m.worked,
      covered: s.covered + m.covered,
      late: s.late + m.late,
      early: s.early + m.early,
      absent: s.absent + m.absent,
    }),
    { planned: 0, worked: 0, covered: 0, late: 0, early: 0, absent: 0 },
  );
  const departments = [
    ...new Set(data.rows.map((r) => r.department || "Хэлтэсгүй")),
  ];
  const views = [
    { id: "overview", label: "Ажилтны гүйцэтгэл", icon: Activity },
    { id: "matrix", label: "Өдөр бүрийн ирц", icon: CalendarDays },
    { id: "risk", label: "Зөрчлийн Top 10", icon: ChartColumn },
    { id: "weekday", label: "Гарагийн шинжилгээ", icon: CalendarDays },
    { id: "time", label: "Цагийн дэлгэрэнгүй", icon: Clock3 },
  ];
  return (
    <div className="wf-insights">
      <div
        className="wf-insight-navigation"
        role="group"
        aria-label="Ирцийн шинжилгээний харагдац"
      >
        {views.map((v) => (
          <button
            key={v.id}
            className={view === v.id ? "active" : ""}
            aria-pressed={view === v.id}
            onClick={() => setView(v.id)}
          >
            <v.icon size={17} />
            {v.label}
          </button>
        ))}
      </div>

      <div className="wf-insight-banner">
        <div>
          <span className="wf-insight-eyebrow">MGL • БАГИЙН ҮЗҮҮЛЭЛТ</span>
          <h2>Цаг ба оролцооны шинжилгээ</h2>
          <p>
            Төлөвлөсөн ажил, бодит бүртгэл, цагийн зөрчлийг нэг дор харьцуулна.
          </p>
        </div>
        <div className="wf-insight-tools">
          <div className="wf-actions">
            <button
              onClick={() => {
                const from = new Date(`${data.range.to}T00:00:00Z`);
                from.setUTCDate(from.getUTCDate() - 6);
                onRange({
                  from: from.toISOString().slice(0, 10),
                  to: data.range.to,
                });
              }}
            >
              7 хоног
            </button>
            <button
              onClick={() =>
                onRange({
                  from: `${data.range.to.slice(0, 7)}-01`,
                  to: data.range.to,
                })
              }
            >
              Энэ сар
            </button>
          </div>
          <label>
            Алба, хэлтэс
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">Бүх хэлтэс</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <Stats
        items={[
          {
            label: "Хуваарийн биелэлт",
            value: totals.planned
              ? `${Math.round((totals.covered / totals.planned) * 100)}%`
              : "—",
          },
          {
            label: "Бодит ажилласан",
            value: minutes(totals.worked),
            tone: "green",
          },
          {
            label: "Хоцролт / эрт явалт",
            value: minutes(totals.late + totals.early),
            tone: "amber",
          },
          { label: "Тасалсан цаг", value: minutes(totals.absent), tone: "red" },
        ]}
      />
      {view === "overview" ? (
        <div className="wf-insight-grid">
          <PerformancePanel
            employees={employeeMetrics}
            departments={departmentMetrics}
          />
          <WeekdayPanel rows={rows} />
        </div>
      ) : view === "matrix" ? (
        <AttendanceMatrix
          rows={rows}
          from={data.range.from}
          to={data.range.to}
          timeZone={data.policy.timeZone}
        />
      ) : view === "weekday" ? (
        <WeekdayPanel rows={rows} />
      ) : view === "risk" ? (
        <>
          <div className="wf-toolbar">
            <p className="wf-muted">
              Ажилтан болон хэлтсийг зэрэгцүүлэн харьцуулах
            </p>
            <select
              aria-label="Зөрчлийн төрөл"
              value={risk}
              onChange={(e) => setRisk(e.target.value as typeof risk)}
            >
              <option value="late">Хоцролт</option>
              <option value="early">Эрт явалт</option>
              <option value="absent">Таслалт</option>
            </select>
          </div>
          <div className="wf-insight-grid">
            <RiskPanel
              title="Top 10 · Ажилтан"
              items={employeeMetrics}
              metric={risk}
            />
            <RiskPanel
              title="Top 10 · Алба, хэлтэс"
              unit="хүн·өдөр"
              items={departmentMetrics}
              metric={risk}
            />
          </div>
        </>
      ) : (
        <TimeBreakdown
          employees={employeeMetrics}
          departments={departmentMetrics}
        />
      )}
    </div>
  );
}
