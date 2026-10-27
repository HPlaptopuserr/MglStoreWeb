"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
export function BuildingDialog({
  title,
  subtitle,
  children,
  onClose,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
    };
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(
    <dialog
      ref={ref}
      className="building-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            onClose();
        }
      }}
    >
      <header className="building-dialog-header">
        <div>
          <p>{subtitle}</p>
          <h2 id={titleId}>{title}</h2>
        </div>
        <button
          type="button"
          className="building-secondary"
          aria-label="Цонх хаах"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      <div className="building-dialog-content">{children}</div>
      <footer>
        {footer ?? (
          <>
            <button
              type="button"
              className="building-primary"
              onClick={onClose}
            >
              Хаах
            </button>
          </>
        )}
      </footer>
    </dialog>,
    document.fullscreenElement ?? document.body,
  );
}
