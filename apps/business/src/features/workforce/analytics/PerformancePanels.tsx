"use client";
import { useState } from "react";
import type { TimeMetric } from "./model";
import { Avatar, Empty, Panel, minutes } from "../components/shared";
export function PerformancePanel({
  employees,
  departments,
}: {
  employees: TimeMetric[];
  departments: TimeMetric[];
}) {
  const [by, setBy] = useState("employee");
  const items = [...(by === "employee" ? employees : departments)]
    .filter((m) => m.ratio !== null)
    .sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0));
  return (
    <Panel title="Төлөвлөсөн цагийн биелэлт">
      <div className="wf-insight-caption">
        <p>
          Хуваарьтай өдрийн ажилласан цаг / төлөвлөсөн цаг. Илүү цаг биелэлтийг
          100%-аас өсгөхгүй.
        </p>
        <div className="wf-segment">
          <button
            aria-pressed={by === "employee"}
            className={by === "employee" ? "active" : ""}
            onClick={() => setBy("employee")}
          >
            Ажилтан
          </button>
          <button
            aria-pressed={by === "department"}
            className={by === "department" ? "active" : ""}
            onClick={() => setBy("department")}
          >
            Хэлтэс
          </button>
        </div>
      </div>
      {items.length ? (
        <div className="wf-insight-list">
          {items.map((m) => (
            <div key={m.id} className="wf-performance-row">
              <Avatar name={m.name} />
              <div>
                <strong>{m.name}</strong>
                <small>
                  {by === "employee" ? m.department : `${m.days} хүн·өдөр`}
                </small>
              </div>
              <div className="wf-performance-track">
                <progress
                  aria-label={`${m.name} цагийн биелэлт`}
                  max={100}
                  value={Math.round((m.ratio ?? 0) * 100)}
                />
                <small>
                  {minutes(m.covered)} / {minutes(m.planned)}
                </small>
              </div>
              <strong>{Math.round((m.ratio ?? 0) * 100)}%</strong>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title="Хуваарьтай бүртгэл алга"
          description="Ажилтны хуваарь үүсэхэд цагийн биелэлтийг тооцно."
        />
      )}
    </Panel>
  );
}
export function RiskPanel({
  items,
  title,
  metric,
  unit = "өдөр",
}: {
  items: TimeMetric[];
  title: string;
  metric: "late" | "early" | "absent";
  unit?: string;
}) {
  const sorted = [...items]
      .filter((m) => m[metric] > 0)
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 10),
    maximum = Math.max(...sorted.map((m) => m[metric]), 1);
  const days =
    metric === "late"
      ? "lateDays"
      : metric === "early"
        ? "earlyDays"
        : "absentDays";
  return (
    <Panel title={title}>
      <p className="wf-panel-note wf-muted">
        Нийт хугацаагаар эрэмбэлсэн эхний 10. Давтамжийг өдрөөр харуулна.
      </p>
      {sorted.length ? (
        <div className="wf-insight-list">
          {sorted.map((m, i) => (
            <div className="wf-risk-row" key={m.id}>
              <span className="wf-rank">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <strong>{m.name}</strong>
                <div className="wf-risk-track">
                  <span style={{ width: `${(m[metric] / maximum) * 100}%` }} />
                </div>
              </div>
              <span>
                <strong>{minutes(m[metric])}</strong>
                <small>{m[days]} {unit}</small>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title="Энэ төрлийн зөрчил алга"
          description="Сонгосон хугацаанд бүртгэгдсэн зөрчил энд харагдана."
        />
      )}
    </Panel>
  );
}
export function TimeBreakdown({
  employees,
  departments,
}: {
  employees: TimeMetric[];
  departments: TimeMetric[];
}) {
  const [by, setBy] = useState("employee");
  const rows = by === "employee" ? employees : departments;
  return (
    <Panel title="Цагийн дэлгэрэнгүй">
      <div className="wf-insight-caption">
        <p>Сонгосон хугацааны нэгтгэл</p>
        <div className="wf-segment">
          <button
            className={by === "employee" ? "active" : ""}
            aria-pressed={by === "employee"}
            onClick={() => setBy("employee")}
          >
            Ажилтан
          </button>
          <button
            className={by === "department" ? "active" : ""}
            aria-pressed={by === "department"}
            onClick={() => setBy("department")}
          >
            Хэлтэс
          </button>
        </div>
      </div>
      {rows.length ? (
        <div className="wf-table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  "Нэр",
                  "Төлөвлөсөн",
                  "Ажилласан",
                  "Хоцролт",
                  "Эрт явсан",
                  "Тасалсан",
                  "Илүү цаг",
                  "Баталсан илүү цаг",
                ].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.name}</strong>
                  </td>
                  {(
                    [
                      "planned",
                      "worked",
                      "late",
                      "early",
                      "absent",
                      "overtime",
                      "approvedOvertime",
                    ] as const
                  ).map((k) => (
                    <td key={k}>{minutes(m[k])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty />
      )}
    </Panel>
  );
}
