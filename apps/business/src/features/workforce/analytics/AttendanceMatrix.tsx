"use client";
import { useMemo, useState } from "react";
import type { WorkforceRow } from "@mgl/types";
import {
  attendanceCategories,
  category,
  weekdayDistribution,
  type AttendanceCategory,
} from "./model";
import { Empty, FormDialog, Panel, minutes, time } from "../components/shared";
export function StatusLegend() {
  return (
    <div className="wf-status-legend">
      {Object.entries(attendanceCategories).map(([key, c]) => (
        <span key={key}>
          <i style={{ background: c.color }} />
          {c.symbol} {c.label}
        </span>
      ))}
    </div>
  );
}
export function WeekdayPanel({ rows }: { rows: WorkforceRow[] }) {
  const groups = weekdayDistribution(rows);
  return (
    <Panel title="Гараг бүрийн ирцийн бүтэц">
      <p className="wf-panel-note wf-muted">
        Хуваарьтай ажилтан-өдөр болон зөвшөөрсөн чөлөөгөөр тооцов.
      </p>
      <StatusLegend />
      {groups.some((g) => g.total) ? (
        <div className="wf-weekday-chart">
          {groups.map((g) => (
            <div className="wf-weekday-row" key={g.name}>
              <strong>{g.name}</strong>
              <div
                className="wf-stacked-track"
                role="img"
                aria-label={`${g.name}: ${
                  Object.entries(g.counts)
                    .filter(([, v]) => v)
                    .map(
                      ([k, v]) =>
                        `${attendanceCategories[k as AttendanceCategory].label} ${v}`,
                    )
                    .join(", ") || "Бүртгэлгүй"
                }`}
              >
                {Object.entries(g.counts).map(
                  ([key, value]) =>
                    value > 0 && (
                      <span
                        key={key}
                        title={`${attendanceCategories[key as AttendanceCategory].label}: ${value}`}
                        style={{
                          width: `${(value / g.total) * 100}%`,
                          background:
                            attendanceCategories[key as AttendanceCategory]
                              .color,
                        }}
                      />
                    ),
                )}
              </div>
              <small>{g.total} хүн·өдөр</small>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="Гарагийн шинжилгээний өгөгдөл алга" />
      )}
    </Panel>
  );
}
export function AttendanceMatrix({
  rows,
  from,
  to,
  timeZone,
}: {
  rows: WorkforceRow[];
  from: string;
  to: string;
  timeZone: string;
}) {
  const [page, setPage] = useState(0),
    [filter, setFilter] = useState(""),
    [selected, setSelected] = useState<WorkforceRow | null>(null);
  const days = useMemo(() => {
    const out: string[] = [];
    for (
      let day = new Date(`${from}T00:00:00Z`);
      +day <= +new Date(`${to}T00:00:00Z`) && out.length < 93;
      day.setUTCDate(day.getUTCDate() + 1)
    )
      out.push(day.toISOString().slice(0, 10));
    return out;
  }, [from, to]);
  const people = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; days: Map<string, WorkforceRow> }
    >();
    for (const row of rows) {
      let person = map.get(row.userId);
      if (!person) {
        person = { id: row.userId, name: row.employeeName, days: new Map() };
        map.set(row.userId, person);
      }
      person.days.set(row.date, row);
    }
    return [...map.values()];
  }, [rows]);
  const filtered = people.filter(
    (p) => !filter || [...p.days.values()].some((r) => category(r) === filter),
  );
  const current = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / 12) - 1),
  );
  return (
    <>
      <Panel title="Өдөр бүрийн ирц">
        <div className="wf-insight-caption">
          <p>
            Нүдийг сонгож тухайн өдрийн бүртгэлийг нээнэ. “—” нь тухайн өдөр
            мэдээлэлгүйг илэрхийлнэ.
          </p>
          <select
            aria-label="Ирцийн зураглалыг шүүх"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Бүх төлөв</option>
            {Object.entries(attendanceCategories).map(([k, c]) => (
              <option key={k} value={k}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <StatusLegend />
        {filtered.length ? (
          <>
            <div className="wf-table-wrap wf-matrix-wrap">
              <table className="wf-matrix">
                <thead>
                  <tr>
                    <th>Ажилтан</th>
                    {days.map((d) => (
                      <th key={d}>
                        <span>
                          {d.slice(5, 7)}/{d.slice(8)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(current * 12, current * 12 + 12).map((p) => (
                    <tr key={p.id}>
                      <th scope="row">{p.name}</th>
                      {days.map((d) => {
                        const row = p.days.get(d);
                        if (!row) return <td key={d}>—</td>;
                        const c = attendanceCategories[category(row)];
                        return (
                          <td key={d}>
                            <button
                              onClick={() => setSelected(row)}
                              title={`${p.name} · ${d} · ${c.label}`}
                              aria-label={`${p.name}, ${d}, ${c.label}`}
                              style={{
                                color: c.color,
                                borderColor: `${c.color}66`,
                                background: `${c.color}18`,
                              }}
                            >
                              {c.symbol}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="wf-insight-caption">
              <span>
                {filtered.length} ажилтан · {current + 1}/
                {Math.ceil(filtered.length / 12)}
              </span>
              <div className="wf-actions">
                <button
                  disabled={current === 0}
                  onClick={() => setPage(current - 1)}
                >
                  Өмнөх
                </button>
                <button
                  disabled={(current + 1) * 12 >= filtered.length}
                  onClick={() => setPage(current + 1)}
                >
                  Дараах
                </button>
              </div>
            </div>
          </>
        ) : (
          <Empty title="Ирцийн зураглалын мэдээлэл алга" />
        )}
      </Panel>
      {selected && (
        <FormDialog
          title={`${selected.employeeName} · ${selected.date}`}
          submitLabel="Хаах"
          onClose={() => setSelected(null)}
          onSubmit={async () => {}}
        >
          <p>
            <strong>{attendanceCategories[category(selected)].label}</strong> ·{" "}
            {selected.shiftName ?? "Хуваарьгүй"}
          </p>
          <p>
            Ирсэн: {time(selected.clockIn, timeZone)} · Явсан:{" "}
            {time(selected.clockOut, timeZone)}
          </p>
          <p>
            Төлөвлөсөн: {minutes(selected.plannedMinutes)} · Ажилласан:{" "}
            {minutes(selected.workedMinutes)}
          </p>
          <p>
            Хоцролт: {minutes(selected.lateMinutes)} · Эрт явсан:{" "}
            {minutes(selected.earlyMinutes)}
          </p>
          <p>
            Тасалсан: {minutes(selected.absentMinutes)} · Илүү цаг:{" "}
            {minutes(selected.overtimeMinutes)}
          </p>
        </FormDialog>
      )}
    </>
  );
}
