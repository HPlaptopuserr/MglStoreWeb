"use client";
import {
  useEffect,
  useId,
  useRef,
  type FormEventHandler,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import "./workforce-dialog.css";
export function WorkforceDialog({
  title,
  subtitle,
  children,
  footer,
  onClose,
  onSubmit,
  busy = false,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  busy?: boolean;
  className?: string;
}) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`wf-dialog wf ${className}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={onSubmit ?? ((event) => event.preventDefault())}
        aria-busy={busy}
      >
        <header>
          <div className="wf-dialog-heading">
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            type="button"
            aria-label="Хаах"
            disabled={busy}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        <div className="wf-dialog-body">{children}</div>
        <footer>{footer}</footer>
      </form>
    </dialog>
  );
}
