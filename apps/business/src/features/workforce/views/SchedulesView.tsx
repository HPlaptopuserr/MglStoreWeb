"use client";
import {
  AssignmentDialog,
  ShiftTemplateDialog,
} from "../components/ScheduleDialogs";
import { useState } from "react";
import { CalendarDays, Copy, Plus } from "lucide-react";
import type { WorkforceAssignment } from "@mgl/types";
import type { WorkforceController } from "../useWorkforce";
import { Avatar, Empty, FormDialog, Panel } from "../components/shared";
const weekdays = [
  "Ням",
  "Даваа",
  "Мягмар",
  "Лхагва",
  "Пүрэв",
  "Баасан",
  "Бямба",
];
function clock(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function SchedulesView({
  controller,
}: {
  controller: WorkforceController;
}) {
  const { data, run, setToast, range } = controller;
  const [shiftForm, setShiftForm] = useState(false),
    [assign, setAssign] = useState(false),
    [copy, setCopy] = useState<WorkforceAssignment | null>(null),
    [remove, setRemove] = useState<WorkforceAssignment | null>(null),
    [department, setDepartment] = useState("");
  if (!data) return null;
  const dates = Array.from(new Set(data.rows.map((r) => r.date))).slice(0, 31);
  const employees = data.employees.filter(
    (e) => e.active && (!department || e.department === department),
  );
  return (
    <>
      <div className="wf-toolbar">
        <p className="wf-muted">
          Ээлжийн загвар үүсгээд ажилтнуудад хугацаагаар онооно.
        </p>
        {data.session.canManageSchedules && (
          <div className="wf-actions">
            {data.session.canManage && (
              <button onClick={() => setShiftForm(true)}>
                <Plus size={16} /> Ээлжийн загвар
              </button>
            )}
            <button className="wf-primary" onClick={() => setAssign(true)}>
              <CalendarDays size={16} /> Хуваарь оноох
            </button>
          </div>
        )}
      </div>
      <div className="wf-shift-list">
        {data.shifts.map((s) => (
          <article
            className="wf-shift-card"
            key={s.id}
            style={{ borderTopColor: s.color }}
          >
            <span className="wf-badge">{s.active ? "Идэвхтэй" : "Архив"}</span>
            <h3>{s.name}</h3>
            <strong>
              {clock(s.startMinute)}–{clock(s.endMinute)}
              {s.endMinute <= s.startMinute ? " (+1 өдөр)" : ""}
            </strong>
            <p>{s.weekdays.map((d) => weekdays[d]).join(" · ")}</p>
            <small>Завсарлага: {s.breakMinutes} минут · ээлжийн дунд</small>
            {data.session.canManage && (
              <button
                onClick={() =>
                  void run(`shifts/${s.id}`, "PATCH", { active: !s.active })
                    .then(() => setToast("Ээлжийн төлөв шинэчлэгдлээ"))
                    .catch((e) =>
                      setToast(e instanceof Error ? e.message : "Алдаа"),
                    )
                }
              >
                {s.active ? "Архивлах" : "Идэвхжүүлэх"}
              </button>
            )}
          </article>
        ))}
        {!data.shifts.length && <Empty title="Ээлжийн загвар алга" />}
      </div>
      <Panel
        title="Хуваарийн календарь"
        action={
          <select
            aria-label="Хэлтэс"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">Бүх хэлтэс</option>
            {data.departments.map((d) => (
              <option key={d.id}>{d.name}</option>
            ))}
          </select>
        }
      >
        <p className="wf-panel-note wf-muted">
          Календарь эхний 31 хоногийг харуулна. Оноолтын жагсаалт сонгосон бүх
          хугацааг хамарна.
        </p>
        {employees.length ? (
          <div className="wf-table-wrap">
            <table className="wf-calendar">
              <thead>
                <tr>
                  <th>Ажилтан</th>
                  {dates.map((d) => (
                    <th key={d}>
                      {d.slice(5)}
                      <small>
                        {weekdays[new Date(`${d}T00:00:00Z`).getUTCDay()]}
                      </small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div className="wf-employee-cell">
                        <Avatar name={e.name} />
                        {e.name}
                      </div>
                    </td>
                    {dates.map((d) => {
                      const assignment = data.assignments.find(
                        (a) =>
                          a.userId === e.userId &&
                          a.from <= d &&
                          a.to >= d &&
                          data.shifts
                            .find((s) => s.id === a.shiftId)
                            ?.weekdays.includes(
                              new Date(`${d}T00:00:00Z`).getUTCDay(),
                            ),
                      );
                      const shift = data.shifts.find(
                        (s) => s.id === assignment?.shiftId,
                      );
                      return (
                        <td key={d}>
                          {shift ? (
                            <span
                              className="wf-calendar-shift"
                              style={{ borderColor: shift.color }}
                            >
                              {shift.name}
                              <small>
                                {clock(shift.startMinute)}–
                                {clock(shift.endMinute)}
                              </small>
                            </span>
                          ) : (
                            <span className="wf-muted">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </Panel>
      <Panel title="Хуваарийн оноолтууд">
        {data.assignments.length ? (
          <div className="wf-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ажилтан</th>
                  <th>Ээлж</th>
                  <th>Хугацаа</th>
                  <th>Бүс</th>
                  <th>Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {data.assignments.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {data.employees.find((e) => e.userId === a.userId)?.name}
                    </td>
                    <td>{data.shifts.find((s) => s.id === a.shiftId)?.name}</td>
                    <td>
                      {a.from} → {a.to}
                    </td>
                    <td>
                      {data.zones.find((z) => z.id === a.zoneId)?.name ?? "—"}
                    </td>
                    <td>
                      {data.session.canManageSchedules && (
                        <div className="wf-actions">
                          <button
                            onClick={() => {
                              setCopy(a);
                              setAssign(true);
                            }}
                          >
                            <Copy size={14} /> Хуулах
                          </button>
                          <button onClick={() => setRemove(a)}>Цуцлах</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Хуваарь оноогоогүй" />
        )}
      </Panel>
      {shiftForm && (
        <ShiftTemplateDialog
          controller={controller}
          onClose={() => setShiftForm(false)}
        />
      )}
      {assign && (
        <AssignmentDialog
          controller={controller}
          copy={copy}
          onClose={() => {
            setAssign(false);
            setCopy(null);
          }}
        />
      )}
      {remove && (
        <FormDialog
          title="Оноолт цуцлах"
          submitLabel="Цуцлах"
          onClose={() => setRemove(null)}
          onSubmit={async () => {
            await run(`assignments/${remove.id}`, "DELETE");
            setToast("Оноолт цуцлагдлаа");
          }}
        >
          <p>
            {remove.from} → {remove.to} хугацааны оноолт цуцлагдана. Холбогдох
            тайлан дахин тооцогдоно. Өөрчлөлтийн түүх хадгалагдана.
          </p>
        </FormDialog>
      )}
    </>
  );
}
