"use client";
import type { WorkforceController } from "../useWorkforce";
import type { WorkTaskReport } from "../work-tasks";
import { EmployeeSelect, Field, FormDialog, stamp } from "./shared";
export function WorkPlanDialog({
  controller,
  onClose,
  onSaved,
}: {
  controller: WorkforceController;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data, run, setToast } = controller;
  if (!data) return null;
  return (
    <FormDialog
      title="Ажлын төлөвлөгөө үүсгэх"
      onClose={onClose}
      onSubmit={async (f) => {
        await run("work-tasks", "POST", {
          title: f.get("title"),
          description: f.get("description"),
          priority: f.get("priority"),
          dueAt: String(f.get("dueAt")),
          assigneeIds: f.getAll("assigneeIds"),
          subTasks: String(f.get("subTasks") ?? "")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        });
        onSaved();
        setToast("Төлөвлөгөө MGL Business апптай холбогдлоо");
      }}
    >
      <p className="wf-muted">
        Оноосон ажилтны MGL Business аппын төлөвлөгөөнд шууд харагдана. Ажилтан
        апп дээр гүйцэтгэлээ зургаар илгээнэ.
      </p>
      <Field label="Төлөвлөгөөний нэр">
        <input name="title" required maxLength={200} />
      </Field>
      <Field label="Ажлын тайлбар">
        <textarea name="description" rows={3} maxLength={5000} />
      </Field>
      <Field label="Хариуцах ажилтан">
        <EmployeeSelect
          employees={data.employees.filter(
            (e) =>
              e.active &&
              (e.userId === data.session.userId ||
                e.role === "STAFF" ||
                (data.session.role === "OWNER" &&
                  ["ADMIN", "MANAGER", "HR"].includes(e.role))),
          )}
          name="assigneeIds"
          multiple
        />
      </Field>
      <Field label="Дуусах хугацаа">
        <input name="dueAt" type="datetime-local" required />
      </Field>
      <Field label="Чухал байдал">
        <select name="priority" defaultValue="NORMAL">
          <option value="LOW">Бага</option>
          <option value="NORMAL">Хэвийн</option>
          <option value="HIGH">Өндөр</option>
          <option value="URGENT">Яаралтай</option>
        </select>
      </Field>
      <Field label="Дэд ажлууд · мөр бүрд нэг">
        <textarea
          name="subTasks"
          rows={3}
          placeholder="Бэлтгэл хийх\nГүйцэтгэх\nҮр дүнгээ шалгах"
        />
      </Field>
    </FormDialog>
  );
}
export function WorkReportDialog({
  report,
  controller,
  onClose,
  onSaved,
}: {
  report: WorkTaskReport;
  controller: WorkforceController;
  onClose: () => void;
  onSaved: () => void;
}) {
  const canApprove =
    controller.data?.session.canManage &&
    report.status === "PENDING_REVIEW" &&
    report.userId !== controller.data.session.userId;
  return (
    <FormDialog
      title={report.title}
      onClose={onClose}
      submitLabel={canApprove ? "Үнэлж батлах" : "Хаах"}
      onSubmit={async (f) => {
        if (!canApprove) return;
        await controller.run(`work-tasks/${report.taskId}/approve`, "PATCH", {
          assigneeId: report.id,
          performanceStars: Number(f.get("performanceStars")),
          productivityPercent: Number(f.get("productivityPercent")),
          note: f.get("note"),
        });
        onSaved();
        controller.setToast("Ажлын тайлан батлагдлаа");
      }}
    >
      <p>
        <strong>{report.name}</strong> · {report.createdBy}
      </p>
      <p style={{ whiteSpace: "pre-wrap" }}>
        {report.description || "Ажлын тайлбар оруулаагүй"}
      </p>
      <p className="wf-muted">
        Дуусах: {report.dueAt ? stamp(report.dueAt) : "—"} · Илгээсэн:{" "}
        {report.submittedAt ? stamp(report.submittedAt) : "—"}
      </p>
      {report.subTasks.length > 0 && (
        <ul>
          {report.subTasks.map((s) => (
            <li key={s.id}>
              {s.completed ? "✓" : "○"} {s.title}
            </li>
          ))}
        </ul>
      )}
      <h3>Гүйцэтгэлийн нотлох зураг</h3>
      {report.evidence.length ? (
        <div className="wf-work-evidence">
          {report.evidence.map((e) => (
            <EvidenceLink
              key={e.id}
              id={e.id}
              organizationId={controller.data?.organization.id ?? ""}
              name={e.name}
            />
          ))}
        </div>
      ) : (
        <p className="wf-muted">Зураг илгээгээгүй байна.</p>
      )}
      {report.comments.length > 0 && (
        <>
          <h3>Ажлын тэмдэглэл</h3>
          {report.comments.map((c) => (
            <p key={c.id}>
              <strong>{c.author}</strong> · {stamp(c.createdAt)}
              <br />
              {c.body}
            </p>
          ))}
        </>
      )}
      {report.approvedAt && (
        <p>
          Үнэлгээ: {report.performanceStars}/10 · Гүйцэтгэл:{" "}
          {report.productivityPercent}%<br />
          {report.evaluationNote}
        </p>
      )}
      {canApprove && (
        <>
          <Field label="Үнэлгээ · 1–10">
            <input
              name="performanceStars"
              type="number"
              min={1}
              max={10}
              defaultValue={8}
              required
            />
          </Field>
          <Field label="Гүйцэтгэл · %">
            <input
              name="productivityPercent"
              type="number"
              min={0}
              max={100}
              defaultValue={100}
              required
            />
          </Field>
          <Field label="Үнэлгээний тайлбар">
            <textarea name="note" rows={3} maxLength={2000} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}
function EvidenceLink({
  id,
  organizationId,
  name,
}: {
  id: string;
  organizationId: string;
  name: string | null;
}) {
  const target = `/api/workforce/work-tasks/evidence/${encodeURIComponent(id)}?organizationId=${encodeURIComponent(organizationId)}`;
  return (
    <a href={target} target="_blank" rel="noopener noreferrer">
      {name || "Нотлох зураг нээх"} ↗
    </a>
  );
}
