"use client";
import { useState } from "react";
import { FileSpreadsheet, Plus } from "lucide-react";
import type { WorkforceController } from "../hooks/useWorkforce";
import { useWorkTasks } from "../hooks/useWorkTasks";
import { workTaskStatusLabels, type WorkTaskReport } from "../model/work-tasks";
import { Empty, Panel, Loading, stamp } from "../components/shared";
import {
  WorkPlanDialog,
  WorkReportDialog,
} from "../components/WorkTaskDialogs";
export function WorkReportsView({
  controller,
}: {
  controller: WorkforceController;
}) {
  const { data, range } = controller;
  const result = useWorkTasks(
    data?.organization.id ?? "",
    range.from,
    range.to,
    data,
  );
  const [tab, setTab] = useState<"reports" | "plans">("reports"),
    [query, setQuery] = useState(""),
    [user, setUser] = useState(""),
    [status, setStatus] = useState(""),
    [files, setFiles] = useState(""),
    [create, setCreate] = useState(false),
    [detail, setDetail] = useState<WorkTaskReport | null>(null),
    [page, setPage] = useState(0);
  if (!data) return null;
  const items = result.items.filter(
    (i) =>
      (tab === "plans" || Boolean(i.submittedAt)) &&
      (!user || i.userId === user) &&
      (!status || i.status === status) &&
      (!files ||
        (files === "yes" ? i.evidence.length > 0 : !i.evidence.length)) &&
      `${i.title} ${i.name}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
  );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(items.length / 25) - 1),
  );
  const queryParams = new URLSearchParams({
    organizationId: data.organization.id,
    from: range.from,
    to: range.to,
    mode: tab,
    user,
    status,
    files,
    search: query,
  });
  return (
    <>
      <div className="wf-toolbar">
        <div className="wf-segment">
          <button
            aria-pressed={tab === "reports"}
            className={tab === "reports" ? "active" : ""}
            onClick={() => {
              setTab("reports");
              setPage(0);
            }}
          >
            Ажлын тайлан
          </button>
          <button
            aria-pressed={tab === "plans"}
            className={tab === "plans" ? "active" : ""}
            onClick={() => {
              setTab("plans");
              setPage(0);
            }}
          >
            Төлөвлөгөө
          </button>
        </div>
        <div className="wf-actions">
          {data.session.canExport && (
            <a
              className="wf-button"
              href={`/api/workforce/work-tasks/export?${queryParams}`}
            >
              <FileSpreadsheet size={16} /> Excel экспорт
            </a>
          )}
          {data.session.canManage && (
            <button className="wf-primary" onClick={() => setCreate(true)}>
              <Plus size={16} /> Төлөвлөгөө үүсгэх
            </button>
          )}
        </div>
      </div>
      <p className="wf-muted">
        MGL Business аппын төлөвлөгөө, гүйцэтгэлийн зураг, дэд ажил болон
        удирдлагын үнэлгээтэй шууд холбогдоно. Сонгосон хугацаанд үүссэн, дуусах
        эсвэл гүйцэтгэл илгээсэн ажлууд.
      </p>
      <Panel
        title={tab === "reports" ? "Илгээсэн ажлын тайлан" : "Ажлын төлөвлөгөө"}
      >
        <div className="wf-filters">
          <input
            aria-label="Тайлангийн нэрээр хайх"
            placeholder="Тайлан, төлөвлөгөөний нэр…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
          <select
            aria-label="Ажилтнаар шүүх"
            value={user}
            onChange={(e) => {
              setUser(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Бүх ажилтан</option>
            {data.employees.map((e) => (
              <option key={e.userId} value={e.userId}>
                {e.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Төлөвөөр шүүх"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Бүх төлөв</option>
            {Object.entries(workTaskStatusLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            aria-label="Файлаар шүүх"
            value={files}
            onChange={(e) => {
              setFiles(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Зураг · бүгд</option>
            <option value="yes">Зурагтай</option>
            <option value="no">Зураггүй</option>
          </select>
        </div>
        {result.loading ? (
          <Loading />
        ) : result.error ? (
          <Empty
            title={result.error}
            action={<button onClick={result.refresh}>Дахин оролдох</button>}
          />
        ) : !items.length ? (
          <Empty
            title={
              tab === "reports"
                ? "Ажлын тайлан ирээгүй байна"
                : "Төлөвлөгөө олдсонгүй"
            }
            description={
              tab === "reports"
                ? "Ажилтан аппын төлөвлөгөө хэсгээс гүйцэтгэлээ илгээхэд энд харагдана."
                : "Огнооны хүрээ, шүүлтүүрээ өөрчлөх эсвэл төлөвлөгөө үүсгэнэ үү."
            }
          />
        ) : (
          <>
            <div className="wf-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ажилтан</th>
                    <th>Тайлан / төлөвлөгөө</th>
                    <th>Файл</th>
                    <th>Дуусах хугацаа</th>
                    <th>Илгээсэн огноо</th>
                    <th>Төлөв</th>
                    <th>Гүйцэтгэл</th>
                    <th>Үйлдэл</th>
                  </tr>
                </thead>
                <tbody>
                  {items
                    .slice(currentPage * 25, currentPage * 25 + 25)
                    .map((i) => (
                      <tr key={i.id}>
                        <td>{i.name}</td>
                        <td>
                          <strong>{i.title}</strong>
                          <small
                            className="wf-muted"
                            style={{ display: "block" }}
                          >
                            {i.subTasks.filter((s) => s.completed).length}/
                            {i.subTasks.length} дэд ажил
                          </small>
                        </td>
                        <td>{i.evidence.length} зураг</td>
                        <td>
                          {i.dueAt ? stamp(i.dueAt, data.policy.timeZone) : "—"}
                        </td>
                        <td>
                          {i.submittedAt
                            ? stamp(i.submittedAt, data.policy.timeZone)
                            : "—"}
                        </td>
                        <td>
                          <span className="wf-badge">
                            {workTaskStatusLabels[i.status]}
                          </span>
                        </td>
                        <td>
                          {i.productivityPercent !== null
                            ? `${i.productivityPercent}% · ${i.performanceStars}/10`
                            : "—"}
                        </td>
                        <td>
                          <button onClick={() => setDetail(i)}>
                            {i.status === "PENDING_REVIEW" &&
                            data.session.canManage
                              ? "Хянах"
                              : "Дэлгэрэнгүй"}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="wf-toolbar">
              <span>
                {items.length} мөр · {currentPage + 1}/
                {Math.ceil(items.length / 25)}
              </span>
              <div className="wf-actions">
                <button
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Өмнөх
                </button>
                <button
                  disabled={(currentPage + 1) * 25 >= items.length}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Дараах
                </button>
              </div>
            </div>
          </>
        )}
      </Panel>
      {create && (
        <WorkPlanDialog
          controller={controller}
          onClose={() => setCreate(false)}
          onSaved={result.refresh}
        />
      )}{" "}
      {detail && (
        <WorkReportDialog
          report={detail}
          controller={controller}
          onClose={() => setDetail(null)}
          onSaved={result.refresh}
        />
      )}
    </>
  );
}
