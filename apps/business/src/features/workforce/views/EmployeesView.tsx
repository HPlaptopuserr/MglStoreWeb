"use client";
import { useState } from "react";
import { Plus, Search, UserRound } from "lucide-react";
import type { WorkforceEmployee } from "@mgl/types";
import type { WorkforceController } from "../useWorkforce";
import {
  Avatar,
  Empty,
  Field,
  FormDialog,
  Panel,
  Stats,
} from "../components/shared";
export function EmployeesView({
  controller,
}: {
  controller: WorkforceController;
}) {
  const { data, run, setToast } = controller;
  const [query, setQuery] = useState(""),
    [department, setDepartment] = useState(""),
    [active, setActive] = useState("active"),
    [edit, setEdit] = useState<WorkforceEmployee | null>(null),
    [add, setAdd] = useState(false),
    [offboard, setOffboard] = useState<WorkforceEmployee | null>(null);
  if (!data) return null;
  const rows = data.employees.filter(
    (e) =>
      (!query ||
        `${e.name} ${e.phone} ${e.email}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (!department || e.department === department) &&
      (active === "all" ||
        (active === "departed"
          ? Boolean(e.employmentEndedAt)
          : active === "inactive"
            ? !e.active && !e.employmentEndedAt
            : e.active)),
  );
  return (
    <>
      <Stats
        items={[
          {
            label: "Идэвхтэй ажилтан",
            value: data.organization.activeMembers,
            tone: "green",
          },
          { label: "Ажилтны лимит", value: data.organization.maxMembers },
          {
            label: "Хэлтэсгүй ажилтан",
            value: data.employees.filter((e) => e.active && !e.department)
              .length,
            tone: "amber",
          },
          {
            label: "Ажлаас гарсан",
            value: data.employees.filter((e) => e.employmentEndedAt).length,
          },
        ]}
      />
      <div className="wf-toolbar">
        <p className="wf-muted">
          Ажилтны бүртгэл нь MGL Business аппын гишүүнчлэлтэй холбоотой.
        </p>
        {data.session.canManage && (
          <button className="wf-primary" onClick={() => setAdd(true)}>
            <Plus size={16} /> Ажилтан нэмэх
          </button>
        )}
      </div>
      <Panel title="Ажилтнууд">
        <div className="wf-filters">
          <label>
            <Search size={16} />
            <input
              aria-label="Ажилтан хайх"
              placeholder="Нэр, имэйл, утсаар хайх…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
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
          <select
            aria-label="Идэвх"
            value={active}
            onChange={(e) => setActive(e.target.value)}
          >
            <option value="active">Идэвхтэй</option>
            <option value="departed">Ажлаас гарсан</option>
            <option value="inactive">Бусад идэвхгүй</option>
            <option value="all">Бүгд</option>
          </select>
        </div>
        {rows.length ? (
          <div className="wf-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ажилтан</th>
                  <th>Холбоо барих</th>
                  <th>Алба, хэлтэс</th>
                  <th>Эрх</th>
                  <th>Элссэн огноо</th>
                  <th>Төлөв</th>
                  <th>Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div className="wf-employee-cell">
                        <Avatar name={e.name} />
                        <strong>{e.name}</strong>
                      </div>
                    </td>
                    <td>
                      {e.email || "—"}
                      <small>{e.phone}</small>
                    </td>
                    <td>{e.department || "Хэлтэсгүй"}</td>
                    <td>
                      {e.role}
                      <small>{e.capabilities.join(", ")}</small>
                    </td>
                    <td>{e.joinedAt.slice(0, 10)}</td>
                    <td>
                      <span
                        className={`wf-badge ${e.active ? "wf-request-approved" : ""}`}
                      >
                        {e.employmentEndedAt
                          ? "Ажлаас гарсан"
                          : e.active
                            ? "Идэвхтэй"
                            : "Идэвхгүй"}
                      </span>
                      {e.employmentEndedAt && (
                        <small>{e.employmentEndedAt}</small>
                      )}
                    </td>
                    <td>
                      {data.session.canManage && (
                        <div className="wf-actions">
                          <button onClick={() => setEdit(e)}>Засах</button>
                          {e.active &&
                            e.role !== "OWNER" &&
                            e.userId !== data.session.userId &&
                            (e.role !== "ADMIN" ||
                              data.session.role === "OWNER") && (
                              <button
                                className="wf-danger"
                                onClick={() => setOffboard(e)}
                              >
                                Ажлаас гаргах
                              </button>
                            )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </Panel>
      {edit && (
        <FormDialog
          title={`${edit.name} · Ажилтны тохиргоо`}
          onClose={() => setEdit(null)}
          onSubmit={async (f) => {
            await run(`employees/${edit.id}`, "PATCH", {
              department: f.get("department"),
              active: f.get("active") === "true",
            });
            setToast("Ажилтны мэдээлэл шинэчлэгдлээ");
          }}
        >
          {edit.employmentEndedAt && (
            <p className="wf-muted">
              Ажлаас гарсан: {edit.employmentEndedAt}
              <br />
              {edit.employmentEndReason}
            </p>
          )}
          <Field label="Алба, хэлтэс">
            <select name="department" defaultValue={edit.department}>
              <option value="">Хэлтэсгүй</option>
              {data.departments.map((d) => (
                <option key={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Төлөв">
            <select name="active" defaultValue={String(edit.active)}>
              <option value="true">Идэвхтэй</option>
              <option value="false">Идэвхгүй</option>
            </select>
          </Field>
          <p className="wf-muted">
            Role болон нэмэлт эрхийг байгууллагын App Control-оос удирдана.
          </p>
        </FormDialog>
      )}
      {add && (
        <FormDialog
          title="Ажилтан нэмэх"
          onClose={() => setAdd(false)}
          onSubmit={async (f) => {
            await run("employees", "POST", { identifier: f.get("identifier") });
            setToast("Ажилтан нэмэгдлээ");
          }}
        >
          <UserRound />
          <p>MGL бүртгэлтэй хэрэглэгчийг байгууллагад ажилтнаар нэмнэ.</p>
          <Field
            label="Бүртгэлтэй утасны дугаар эсвэл имэйл"
            hint="8 оронтой дугаар, +976 дугаар эсвэл имэйл оруулна уу."
          >
            <input
              type="text"
              name="identifier"
              autoComplete="off"
              placeholder="Утасны дугаар эсвэл имэйл"
              required
              maxLength={254}
            />
          </Field>
          <p className="wf-muted">
            {data.organization.activeMembers} / {data.organization.maxMembers}{" "}
            эрх ашиглаж байна.
          </p>
        </FormDialog>
      )}
      {offboard && (
        <FormDialog
          title={`${offboard.name} · Ажлаас гаргах`}
          submitLabel="Ажлаас гаргах"
          onClose={() => setOffboard(null)}
          onSubmit={async (f) => {
            await run(`employees/${offboard.id}/offboard`, "POST", {
              lastDay: f.get("lastDay"),
              reason: f.get("reason"),
            });
            setToast(
              "Ажилтны гишүүнчлэл дуусгаж, байгууллагын хандалтыг хаалаа",
            );
            setActive("departed");
          }}
        >
          <p>
            <strong>{offboard.name}</strong> ажилтны тухайн байгууллагын хандалт
            хаагдана. Ирц, хүсэлт, тайлан болон өөрчлөлтийн түүх хадгалагдана.
          </p>
          <Field label="Сүүлийн ажилласан өдөр">
            <input
              name="lastDay"
              type="date"
              min={offboard.joinedAt.slice(0, 10)}
              max={data.today}
              defaultValue={data.today}
              required
            />
          </Field>
          <Field label="Ажлаас гарсан шалтгаан">
            <textarea name="reason" rows={3} maxLength={2000} required />
          </Field>
          <label className="wf-checkbox">
            <input type="checkbox" required />
            Тухайн байгууллагын хандалтыг хаахыг баталгаажуулж байна.
          </label>
        </FormDialog>
      )}
    </>
  );
}
