"use client";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Inbox, X } from "lucide-react";
import type { WorkforceEmployee, WorkforceStatus } from "@mgl/types";
import { workforceStatusLabels } from "@mgl/types";
export function minutes(value: number) {
  return `${Math.floor(value / 60)}ц ${Math.round(value % 60)}м`;
}
export function time(value: string | null, timeZone = "Asia/Ulaanbaatar") {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(value))
    : "—";
}
export function stamp(value: string, timeZone = "Asia/Ulaanbaatar") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
  return `${parts} ${time(value, timeZone)}`;
}
export function money(value: number) {
  return `${value.toLocaleString("en-US")}₮`;
}
export function Avatar({ name }: { name: string }) {
  return (
    <span className="wf-avatar" aria-hidden="true">
      {name.trim().slice(0, 1) || "А"}
    </span>
  );
}
export function Empty({
  title = "Мэдээлэл олдсонгүй",
  description = "Шүүлтүүрээ өөрчлөх эсвэл шинэ мэдээлэл нэмнэ үү.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="wf-empty">
      <Inbox size={36} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function StatusBadge({ status }: { status: WorkforceStatus }) {
  return (
    <span className={`wf-badge wf-status-${status.toLowerCase()}`}>
      {workforceStatusLabels[status]}
    </span>
  );
}
export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`wf-panel ${className}`}>
      <header className="wf-panel-header">
        <h2>{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}
export function Stats({
  items,
}: {
  items: {
    label: string;
    value: string | number;
    hint?: string;
    tone?: "green" | "red" | "blue" | "amber";
  }[];
}) {
  return (
    <div className="wf-stats">
      {items.map((item) => (
        <div key={item.label} className={`wf-stat ${item.tone ?? "blue"}`}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.hint && <small>{item.hint}</small>}
        </div>
      ))}
    </div>
  );
}
export function EmployeeSelect({
  employees,
  name = "userId",
  multiple = false,
  required = true,
  defaultValue,
}: {
  employees: WorkforceEmployee[];
  name?: string;
  multiple?: boolean;
  required?: boolean;
  defaultValue?: string | string[];
}) {
  return (
    <select
      name={name}
      multiple={multiple}
      required={required}
      defaultValue={defaultValue}
      size={multiple ? Math.min(6, employees.length + 1) : undefined}
    >
      {!multiple && <option value="">Ажилтан сонгох</option>}
      {employees
        .filter((e) => e.active)
        .map((e) => (
          <option key={e.userId} value={e.userId}>
            {e.name}
            {e.department ? ` · ${e.department}` : ""}
          </option>
        ))}
    </select>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="wf-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function FormDialog({
  title,
  children,
  onClose,
  onSubmit,
  submitLabel = "Хадгалах",
  submitDisabled = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSubmit: (form: FormData) => Promise<void>;
  submitLabel?: string;
  submitDisabled?: boolean;
}) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => {
      node?.close();
    };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || submitDisabled) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      await onSubmit(form);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Үйлдэл амжилтгүй");
    } finally {
      setPending(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="wf-dialog wf"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
    >
      <form onSubmit={submit}>
        <header>
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            aria-label="Хаах"
            disabled={pending}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        <div className="wf-dialog-body">
          {error && (
            <p role="alert" className="wf-error">
              {error}
            </p>
          )}
          {children}
        </div>
        <footer>
          <button type="button" disabled={pending} onClick={onClose}>
            Болих
          </button>
          <button className="wf-primary" disabled={pending || submitDisabled}>
            {pending ? "Хадгалж байна…" : submitLabel}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
export function Loading() {
  return (
    <div role="status" aria-label="Ачаалж байна" className="wf-loading">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} />
      ))}
      <span className="wf-sr-only">Мэдээлэл ачаалж байна…</span>
    </div>
  );
}
export function ActionButton({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  const [pending, setPending] = useState(false);
  return (
    <button
      disabled={disabled || pending}
      onClick={() => {
        if (pending) return;
        setPending(true);
        try {
          onClick();
        } finally {
          setPending(false);
        }
      }}
    >
      {children}
    </button>
  );
}
