"use client";
import { useState, type FormEvent } from "react";
import { workforceRequestLabels } from "@mgl/types";
import type { WorkforceController } from "../useWorkforce";
import { Field, Panel } from "../components/shared";
export function SettingsView({
  controller,
}: {
  controller: WorkforceController;
}) {
  const { data, run, setToast } = controller;
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  if (!data) return null;
  const snapshot = data;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const f = new FormData(e.currentTarget);
    setPending(true);
    setError("");
    try {
      await run("policy", "PATCH", {
        timeZone: f.get("timeZone"),
        lateGraceMinutes: Number(f.get("grace")),
        requestKinds: f.getAll("requestKinds"),
      });
      setToast("Тохиргоо хадгалагдлаа");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="wf-settings-layout">
      <Panel title="Цаг бүртгэлийн тохиргоо">
        <form onSubmit={submit} className="wf-settings-form">
          <fieldset disabled={!snapshot.session.canManage || pending}>
            {error && (
              <p className="wf-error" role="alert">
                {error}
              </p>
            )}
            <Field label="Байгууллагын цагийн бүс">
              <select name="timeZone" defaultValue={snapshot.policy.timeZone}>
                <option value="Asia/Ulaanbaatar">
                  Asia/Ulaanbaatar · UTC+8
                </option>
                <option value="Asia/Hovd">Asia/Hovd · UTC+7</option>
                <option value="Asia/Choibalsan">Asia/Choibalsan</option>
              </select>
            </Field>
            <Field
              label="Хоцролтын хүлцэл (минут)"
              hint="Хүлцлээс хэтэрсэн хугацааг хоцролтод тооцно."
            >
              <input
                name="grace"
                type="number"
                min={0}
                max={120}
                defaultValue={snapshot.policy.lateGraceMinutes}
                required
              />
            </Field>
            <fieldset className="wf-checkboxes">
              <legend>Хүсэлтийн төрөл</legend>
              {Object.entries(workforceRequestLabels).map(([kind, label]) => (
                <label key={kind}>
                  <input
                    type="checkbox"
                    name="requestKinds"
                    value={kind}
                    defaultChecked={snapshot.policy.requestKinds.some(
                      (k) => k === kind,
                    )}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <p className="wf-muted">
              Цагийн өөрчлөлт бүр удирдлагын баталгаажуулалттай. Завсарлагыг
              ээлжийн загвар тус бүрд тохируулна.
            </p>
            <button className="wf-primary" disabled={pending}>
              {pending ? "Хадгалж байна…" : "Тохиргоо хадгалах"}
            </button>
          </fieldset>
        </form>
      </Panel>
      <Panel title="Өөрчлөлтийн түүх">
        <div className="wf-audit-list">
          {snapshot.audit.map((a) => (
            <details key={a.id}>
              <summary>
                <strong>{a.action}</strong>
                <small>
                  {new Date(a.createdAt).toLocaleString("mn-MN", {
                    timeZone: snapshot.policy.timeZone,
                  })}
                </small>
                <span>
                  {snapshot.employees.find((e) => e.userId === a.actorId)
                    ?.name ?? "Платформын админ"}
                </span>
              </summary>
              <pre>
                {JSON.stringify({ before: a.before, after: a.after }, null, 2)}
              </pre>
            </details>
          ))}
          {!snapshot.audit.length && (
            <p className="wf-panel-note wf-muted">Өөрчлөлтийн түүх алга.</p>
          )}
        </div>
      </Panel>
    </div>
  );
}
