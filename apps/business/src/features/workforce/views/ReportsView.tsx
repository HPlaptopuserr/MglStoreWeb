"use client";
import { useMemo, useState } from "react";
import { Download, Printer, Search } from "lucide-react";
import { workforceStatusLabels, type WorkforceStatus } from "@mgl/types";
import type { WorkforceController } from "../useWorkforce";
import {
  Avatar,
  Empty,
  Panel,
  Stats,
  StatusBadge,
  minutes,
  time,
} from "../components/shared";
export function ReportsView({
  controller,
}: {
  controller: WorkforceController;
}) {
  const { data, range } = controller;
  const [employee, setEmployee] = useState(""),
    [department, setDepartment] = useState(""),
    [status, setStatus] = useState(""),
    [query, setQuery] = useState(""),
    [counts, setCounts] = useState(false),
    [daily, setDaily] = useState(true),
    [date, setDate] = useState(""),
    [page, setPage] = useState(1);
  const rows = useMemo(
    () =>
      data?.rows.filter(
        (r) =>
          (!employee || r.userId === employee) &&
          (!department || r.department === department) &&
          (!status || r.status === status) &&
          (!query ||
            r.employeeName.toLowerCase().includes(query.toLowerCase())) &&
          (!daily || r.date === (date || range.to)),
      ) ?? [],
    [data, employee, department, status, query, daily, date, range.to],
  );
  if (!data) return null;
  const sum = (
    key:
      | "plannedMinutes"
      | "workedMinutes"
      | "lateMinutes"
      | "earlyMinutes"
      | "absentMinutes"
      | "approvedOvertimeMinutes",
  ) => rows.reduce((s, r) => s + r[key], 0);
  const dates = [...new Set(data.rows.map((r) => r.date))];
  const queryExport = new URLSearchParams({
    organizationId: data.organization.id,
    from: daily ? date || range.to : range.from,
    to: daily ? date || range.to : range.to,
    ...(employee ? { userId: employee } : {}),
    ...(department ? { department } : {}),
    ...(status ? { status } : {}),
  });
  const totalPages = Math.max(1, Math.ceil(rows.length / 25)),
    current = Math.min(page, totalPages);
  return (
    <>
      <div className="wf-toolbar">
        <div className="wf-segment">
          <button
            className={!counts ? "active" : ""}
            onClick={() => setCounts(false)}
          >
            Цагаар
          </button>
          <button
            className={counts ? "active" : ""}
            onClick={() => setCounts(true)}
          >
            Тоогоор
          </button>
        </div>
        <div className="wf-actions">
          {data.session.canExport && (
            <a
              className="wf-button"
              href={`/api/workforce/export?${queryExport}`}
            >
              <Download size={16} /> Excel экспорт
            </a>
          )}
          <button onClick={() => window.print()}>
            <Printer size={16} /> Хэвлэх / PDF
          </button>
        </div>
      </div>
      <Stats
        items={
          counts
            ? [
                { label: "Нийт мөр", value: rows.length },
                {
                  label: "Бүртгэлтэй",
                  value: rows.filter((r) => r.clockIn).length,
                  tone: "green",
                },
                {
                  label: "Хоцорсон",
                  value: rows.filter((r) => r.lateMinutes > 0).length,
                  tone: "amber",
                },
                {
                  label: "Тасалсан",
                  value: rows.filter((r) => r.status === "ABSENT").length,
                  tone: "red",
                },
              ]
            : [
                {
                  label: "Ажиллавал зохих",
                  value: minutes(sum("plannedMinutes")),
                },
                {
                  label: "Ажилласан",
                  value: minutes(sum("workedMinutes")),
                  tone: "green",
                },
                {
                  label: "Тасалсан",
                  value: minutes(sum("absentMinutes")),
                  tone: "red",
                },
                {
                  label: "Хоцорсон",
                  value: minutes(sum("lateMinutes")),
                  tone: "red",
                },
                {
                  label: "Эрт гарсан",
                  value: minutes(sum("earlyMinutes")),
                  tone: "amber",
                },
                {
                  label: "Батлагдсан илүү цаг",
                  value: minutes(sum("approvedOvertimeMinutes")),
                  tone: "green",
                },
              ]
        }
      />
      <div className="wf-day-strip">
        <div className="wf-segment">
          <button
            className={daily ? "active" : ""}
            onClick={() => setDaily(true)}
          >
            Өдрөөр
          </button>
          <button
            className={!daily ? "active" : ""}
            onClick={() => setDaily(false)}
          >
            Бүх өдөр
          </button>
        </div>
        {daily && (
          <select
            aria-label="Тайлангийн өдөр"
            value={date || range.to}
            onChange={(e) => setDate(e.target.value)}
          >
            {dates.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        )}
      </div>
      <Panel title="Ажилтны өдрийн цагийн тайлан">
        <div className="wf-filters">
          <label>
            <Search size={15} />
            <input
              aria-label="Нэрээр хайх"
              placeholder="Нэрээр хайх…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <select
            aria-label="Ажилтан"
            value={employee}
            onChange={(e) => setEmployee(e.target.value)}
          >
            <option value="">Бүх ажилтан</option>
            {data.employees
              .filter((e) => e.active)
              .map((e) => (
                <option key={e.userId} value={e.userId}>
                  {e.name}
                </option>
              ))}
          </select>
          <select
            aria-label="Хэлтэс"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">Бүх хэлтэс</option>
            {data.departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Ирцийн төлөв"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Бүх төлөв</option>
            {Object.entries(workforceStatusLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setEmployee("");
              setDepartment("");
              setStatus("");
              setQuery("");
            }}
          >
            Цэвэрлэх
          </button>
        </div>
        {rows.length ? (
          <div className="wf-table-wrap">
            <table>
              <thead>
                <tr>
                  {[
                    "Огноо",
                    "Ажилтан",
                    "Ирцийн төлөв",
                    "Хуваарь",
                    "Ирсэн",
                    "Явсан",
                    "Ажиллах цаг",
                    "Ажилласан",
                    "Хоцролт",
                    "Эрт явалт",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice((current - 1) * 25, current * 25).map((row) => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td>
                      <div className="wf-employee-cell">
                        <Avatar name={row.employeeName} />
                        <div>
                          <strong>{row.employeeName}</strong>
                          <small>{row.department || "Хэлтэсгүй"}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={row.status as WorkforceStatus} />
                    </td>
                    <td>
                      {row.scheduledStart
                        ? `${time(row.scheduledStart, data.policy.timeZone)}–${time(row.scheduledEnd, data.policy.timeZone)}`
                        : "—"}
                      <small>{row.shiftName}</small>
                    </td>
                    <td>{time(row.clockIn, data.policy.timeZone)}</td>
                    <td>{time(row.clockOut, data.policy.timeZone)}</td>
                    <td>
                      {row.plannedMinutes ? minutes(row.plannedMinutes) : "—"}
                    </td>
                    <td>{row.clockIn ? minutes(row.workedMinutes) : "—"}</td>
                    <td className={row.lateMinutes ? "wf-red" : ""}>
                      {row.lateMinutes ? minutes(row.lateMinutes) : "—"}
                    </td>
                    <td>
                      {row.earlyMinutes ? minutes(row.earlyMinutes) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
        <div className="wf-pagination">
          <span>
            Нийт {rows.length} мөр · {current} / {totalPages}
          </span>
          <button disabled={current === 1} onClick={() => setPage(current - 1)}>
            Өмнөх
          </button>
          <button
            disabled={current === totalPages}
            onClick={() => setPage(current + 1)}
          >
            Дараах
          </button>
        </div>
      </Panel>
    </>
  );
}
