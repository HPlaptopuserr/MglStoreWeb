"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Loader2, X } from "lucide-react";
import { createUser } from "./system-users.api";
import type { CreateUserInput } from "./types";

type Props = {
  onClose: () => void;
  onCreated: () => void;
};

export function CreateUserModal({ onClose, onCreated }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [form, setForm] = useState<CreateUserInput>({
    fullName: "",
    phone: "",
    email: "",
    password: "",
  });
  const [creating, setCreating] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    dialog?.querySelector<HTMLInputElement>("input")?.focus();
    return () => dialog?.close();
  }, []);

  function closeDialog() {
    if (submitting.current) return;
    dialogRef.current?.close();
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setCreating(true);
    setError("");
    try {
      await createUser({
        ...form,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      dialogRef.current?.close();
      onCreated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Хэрэглэгч үүсгэхэд алдаа гарлаа",
      );
    } finally {
      submitting.current = false;
      setCreating(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200";
  const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl backdrop:bg-black/40"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 id={`${id}-title`} className="text-lg font-bold text-slate-900">
          Шинэ хэрэглэгч
        </h3>
        <button
          type="button"
          onClick={closeDialog}
          disabled={creating}
          aria-label="Хаах"
          className="rounded-lg p-1 hover:bg-slate-100 disabled:opacity-50"
        >
          <X className="h-5 w-5 text-slate-400" aria-hidden="true" />
        </button>
      </div>
      <p id={`${id}-description`} className="mb-5 text-sm text-slate-500">
        Баталгаажуулах код шаардахгүйгээр ердийн хэрэглэгч үүсгэнэ. Утасны
        дугаар, нууц үгээр нэвтрэх боломжтой.
      </p>
      <form onSubmit={handleSubmit} aria-busy={creating}>
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          >
            {error}
          </p>
        )}
        <fieldset disabled={creating} className="space-y-4 disabled:opacity-60">
          <div>
            <label htmlFor={`${id}-name`} className={labelClass}>
              Бүтэн нэр
            </label>
            <input
              id={`${id}-name`}
              autoFocus
              required
              maxLength={200}
              autoComplete="off"
              value={form.fullName}
              onChange={(event) =>
                setForm({ ...form, fullName: event.target.value })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${id}-phone`} className={labelClass}>
              Утасны дугаар
            </label>
            <input
              id={`${id}-phone`}
              type="tel"
              required
              maxLength={24}
              autoComplete="off"
              placeholder="89122723"
              value={form.phone}
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${id}-email`} className={labelClass}>
              Имэйл
            </label>
            <input
              id={`${id}-email`}
              type="email"
              required
              maxLength={254}
              autoComplete="off"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={`${id}-password`} className={labelClass}>
              Нууц үг
            </label>
            <input
              id={`${id}-password`}
              type="password"
              required
              minLength={6}
              maxLength={72}
              autoComplete="new-password"
              placeholder="Хамгийн багадаа 6 тэмдэгт"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
              className={inputClass}
            />
            <button
              type="button"
              disabled={!/^[5-9]\d{7}$/.test(form.phone.trim())}
              onClick={() => setForm({ ...form, password: form.phone.trim() })}
              className="mt-2 text-xs font-semibold text-violet-600 hover:underline disabled:opacity-40"
            >
              Утасны дугаараар тохируулах
            </button>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeDialog}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Болих
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              {creating && (
                <Loader2
                  className="h-4 w-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              )}
              {creating ? "Үүсгэж байна..." : "Хэрэглэгч үүсгэх"}
            </button>
          </div>
        </fieldset>
      </form>
    </dialog>
  );
}
