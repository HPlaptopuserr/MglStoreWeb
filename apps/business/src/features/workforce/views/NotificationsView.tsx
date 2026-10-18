"use client";
import { useState } from "react";
import { Bell, Plus } from "lucide-react";
import type { WorkforceController } from "../useWorkforce";
import {
  Empty,
  EmployeeSelect,
  Field,
  FormDialog,
  Panel,
} from "../components/shared";
export function NotificationsView({
  controller,
}: {
  controller: WorkforceController;
}) {
  const { data, run, setToast } = controller;
  const [create, setCreate] = useState(false),
    [query, setQuery] = useState("");
  if (!data) return null;
  const notices = data.notices.filter((n) =>
    `${n.title} ${n.content}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="wf-toolbar">
        <p className="wf-muted">
          Апп доторх мэдэгдлийн хүлээн авагч, уншсан төлөв, илгээсэн түүх.
        </p>
        {data.session.canManage && (
          <button className="wf-primary" onClick={() => setCreate(true)}>
            <Plus size={16} /> Мэдэгдэл илгээх
          </button>
        )}
      </div>
      <Panel title="Илгээсэн түүх" action={<Bell size={18} />}>
        <div className="wf-filters">
          <input
            placeholder="Гарчиг, агуулгаар хайх…"
            aria-label="Мэдэгдэл хайх"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {notices.length ? (
          <div className="wf-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Илгээсэн</th>
                  <th>Гарчиг / Агуулга</th>
                  <th>Уншсан</th>
                  <th>Хүлээн авагч</th>
                  <th>Үүсгэсэн</th>
                </tr>
              </thead>
              <tbody>
                {notices.map((n) => (
                  <tr key={n.id}>
                    <td>
                      {n.createdAt.slice(0, 10)}
                      <small>
                        {new Intl.DateTimeFormat("en-GB", {
                          timeZone: data.policy.timeZone,
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(n.createdAt))}
                      </small>
                    </td>
                    <td>
                      <strong>{n.title}</strong>
                      <p className="wf-prewrap wf-notice-content">
                        {n.content}
                      </p>
                    </td>
                    <td>
                      {n.readBy.length} / {n.userIds.length}
                    </td>
                    <td>
                      <details>
                        <summary>{n.userIds.length} ажилтан</summary>
                        <p>
                          {n.userIds
                            .map(
                              (id) =>
                                data.employees.find((e) => e.userId === id)
                                  ?.name ?? "Ажилтан",
                            )
                            .join(", ")}
                        </p>
                      </details>
                    </td>
                    <td>
                      {data.employees.find((e) => e.userId === n.createdBy)
                        ?.name ?? "Удирдлага"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Мэдэгдэл олдсонгүй"
            description="Мэдэгдэл илгээсний дараа түүх энд харагдана."
          />
        )}
      </Panel>
      {create && (
        <FormDialog
          title="Мэдэгдэл илгээх"
          submitLabel="Илгээх"
          onClose={() => setCreate(false)}
          onSubmit={async (f) => {
            const userIds =
              f.get("all") === "on"
                ? data.employees.filter((e) => e.active).map((e) => e.userId)
                : f.getAll("userIds");
            await run("notices", "POST", {
              title: f.get("title"),
              content: f.get("content"),
              userIds,
            });
            setToast("Мэдэгдэл хадгалагдлаа");
          }}
        >
          <label className="wf-checkbox">
            <input name="all" type="checkbox" /> Бүх идэвхтэй ажилтанд
          </label>
          <Field label="Хүлээн авагч">
            <EmployeeSelect
              employees={data.employees}
              name="userIds"
              multiple
              required={false}
            />
          </Field>
          <Field label="Гарчиг">
            <input name="title" required maxLength={200} />
          </Field>
          <Field label="Агуулга">
            <textarea name="content" rows={5} required maxLength={5000} />
          </Field>
        </FormDialog>
      )}
    </>
  );
}
