"use client";
import { RequestCreateDialog } from "../components/RequestCreateDialog";
import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { workforceRequestLabels, type WorkforceRequest } from "@mgl/types";
import type { WorkforceController } from "../hooks/useWorkforce";
import {
  Avatar,
  Empty,
  Field,
  FormDialog,
  Panel,
  time,
  stamp,
} from "../components/shared";
export function RequestsView({
  controller,
}: {
  controller: WorkforceController;
}) {
  const { data, run, setToast } = controller;
  const [create, setCreate] = useState(false),
    [filter, setFilter] = useState("PENDING"),
    [type, setType] = useState(""),
    [employee, setEmployee] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [decision, setDecision] = useState<{
      ids: string[];
      value: "APPROVED" | "REJECTED";
    } | null>(null),
    [detail, setDetail] = useState<WorkforceRequest | null>(null);
  if (!data) return null;
  const rows = data.requests.filter(
    (r) =>
      (!filter || r.state === filter) &&
      (!type || r.kind === type) &&
      (!employee || r.userId === employee),
  );
  const stateLabels = {
    PENDING: "Хүлээгдэж буй",
    APPROVED: "Зөвшөөрсөн",
    REJECTED: "Татгалзсан",
    CANCELLED: "Цуцалсан",
  };
  return (
    <>
      <div className="wf-toolbar">
        <p className="wf-muted">
          Хүсэлт бүрийн шийдвэр болон цагийн өөрчлөлт түүхэнд хадгалагдана.
        </p>
        {data.session.canManage && (
          <button className="wf-primary" onClick={() => setCreate(true)}>
            <Plus size={17} /> Хүсэлт бүртгэх
          </button>
        )}
      </div>
      <Panel title="Цагийн хүсэлт">
        <div className="wf-filters">
          <select
            aria-label="Хүсэлтийн төлөв"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setSelected([]);
            }}
          >
            <option value="">Бүх төлөв</option>
            {Object.entries(stateLabels).map(([k, v]) => (
              <option value={k} key={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            aria-label="Хүсэлтийн төрөл"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Бүх төрөл</option>
            {Object.entries(workforceRequestLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            aria-label="Ажилтнаар шүүх"
            value={employee}
            onChange={(e) => setEmployee(e.target.value)}
          >
            <option value="">Бүх ажилтан</option>
            {data.employees.map((e) => (
              <option key={e.userId} value={e.userId}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        {rows.length ? (
          <div className="wf-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Бүх хүлээгдэж буй хүсэлтийг сонгох"
                      checked={
                        rows.filter((r) => r.state === "PENDING").length > 0 &&
                        rows
                          .filter((r) => r.state === "PENDING")
                          .every((r) => selected.includes(r.id))
                      }
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? rows
                                .filter((r) => r.state === "PENDING")
                                .map((r) => r.id)
                            : [],
                        )
                      }
                    />
                  </th>
                  <th>Ажилтан</th>
                  <th>Хүсэлтийн төрөл</th>
                  <th>Хүсэлтийн огноо</th>
                  <th>Тайлбар</th>
                  <th>Төлөв</th>
                  <th>Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const name =
                    data.employees.find((e) => e.userId === r.userId)?.name ??
                    "Ажилтан";
                  return (
                    <tr key={r.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`${name} хүсэлтийг сонгох`}
                          disabled={r.state !== "PENDING"}
                          checked={selected.includes(r.id)}
                          onChange={(e) =>
                            setSelected((v) =>
                              e.target.checked
                                ? [...v, r.id]
                                : v.filter((id) => id !== r.id),
                            )
                          }
                        />
                      </td>
                      <td>
                        <div className="wf-employee-cell">
                          <Avatar name={name} />
                          {name}
                        </div>
                      </td>
                      <td>
                        {workforceRequestLabels[r.kind]}
                        <small>
                          {r.direction === "IN"
                            ? "Ирэх"
                            : r.direction === "OUT"
                              ? "Явах"
                              : ""}
                        </small>
                      </td>
                      <td>
                        {stamp(r.from, data.policy.timeZone).slice(0, 10)}
                        <small>
                          {time(r.from, data.policy.timeZone)} →{" "}
                          {stamp(r.to, data.policy.timeZone).slice(0, 10)}{" "}
                          {time(r.to, data.policy.timeZone)}
                        </small>
                      </td>
                      <td>
                        <button
                          className="wf-truncate"
                          onClick={() => setDetail(r)}
                        >
                          {r.note}
                        </button>
                      </td>
                      <td>
                        <span
                          className={`wf-badge wf-request-${r.state.toLowerCase()}`}
                        >
                          {stateLabels[r.state]}
                        </span>
                      </td>
                      <td>
                        <div className="wf-actions">
                          {r.state === "PENDING" &&
                            data.session.canApproveRequests && (
                              <>
                                <button
                                  className="wf-green"
                                  disabled={r.userId === data.session.userId}
                                  onClick={() =>
                                    setDecision({
                                      ids: [r.id],
                                      value: "APPROVED",
                                    })
                                  }
                                >
                                  <Check size={15} /> Зөвшөөрөх
                                </button>
                                <button
                                  aria-label="Татгалзах"
                                  onClick={() =>
                                    setDecision({
                                      ids: [r.id],
                                      value: "REJECTED",
                                    })
                                  }
                                >
                                  <X size={15} />
                                </button>
                              </>
                            )}
                          <button onClick={() => setDetail(r)}>
                            Дэлгэрэнгүй
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Хүсэлт олдсонгүй" />
        )}
      </Panel>
      {selected.length > 0 && data.session.canApproveRequests && (
        <div className="wf-bulk">
          <strong>{selected.length} сонгосон</strong>
          <button
            onClick={() => setDecision({ ids: selected, value: "APPROVED" })}
          >
            Зөвшөөрөх
          </button>
          <button
            onClick={() => setDecision({ ids: selected, value: "REJECTED" })}
          >
            Татгалзах
          </button>
          <button onClick={() => setSelected([])}>Цэвэрлэх</button>
        </div>
      )}
      {create && (
        <RequestCreateDialog
          controller={controller}
          onClose={() => setCreate(false)}
        />
      )}
      {decision && (
        <FormDialog
          title={
            decision.value === "APPROVED"
              ? "Хүсэлт зөвшөөрөх"
              : "Хүсэлт татгалзах"
          }
          submitLabel="Шийдвэр хадгалах"
          onClose={() => setDecision(null)}
          onSubmit={async (f) => {
            const result = await run<{
              results: { id: string; ok: boolean; message?: string }[];
            }>("requests/decide", "POST", {
              ids: decision.ids,
              decision: decision.value,
              note: f.get("note"),
            });
            setSelected([]);
            const failures = result.results.filter((r) => !r.ok);
            setToast(
              `${result.results.length - failures.length} хүсэлт шийдвэрлэгдлээ${failures.length ? ` · ${failures.map((r) => r.message).join("; ")}` : ""}`,
            );
          }}
        >
          <p>{decision.ids.length} хүсэлтэд шийдвэр гаргана.</p>
          <Field label="Шийдвэрийн тайлбар">
            <textarea
              name="note"
              maxLength={1000}
              required={decision.value === "REJECTED"}
            />
          </Field>
        </FormDialog>
      )}
      {detail && (
        <FormDialog
          title="Хүсэлтийн дэлгэрэнгүй"
          submitLabel={detail.state === "PENDING" ? "Хүсэлтийг цуцлах" : "Хаах"}
          onClose={() => setDetail(null)}
          onSubmit={async () => {
            if (detail.state === "PENDING")
              await run(`requests/${detail.id}/cancel`);
          }}
        >
          <p>
            {workforceRequestLabels[detail.kind]} · {stateLabels[detail.state]}
          </p>
          <p className="wf-prewrap">{detail.note}</p>
          <p>
            {stamp(detail.from, data.policy.timeZone)} →{" "}
            {stamp(detail.to, data.policy.timeZone)}
          </p>
          {detail.decidedAt && (
            <p>
              Шийдвэр: {detail.decidedAt.slice(0, 16)}
              <br />
              {detail.decisionNote}
            </p>
          )}
        </FormDialog>
      )}
    </>
  );
}
