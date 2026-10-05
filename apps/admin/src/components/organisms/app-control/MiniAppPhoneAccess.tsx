"use client";
import { useId, useState } from "react";
import { Check, Phone, Plus, ShieldCheck, X } from "lucide-react";
import { normalizeMiniAppPhone } from "@mgl/types";

export function MiniAppPhoneAccess({
  phones,
  onChange,
}: {
  phones: string[];
  onChange: (phones: string[]) => void;
}) {
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  function add() {
    const entries = draft
      .split(/[\n,;]+/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (!entries.length) return;
    const normalized = entries.map(normalizeMiniAppPhone);
    if (normalized.some((value) => !value)) {
      setError(
        "8 оронтой дугаар оруулна уу. Олон дугаарыг таслалаар тусгаарлана.",
      );
      return;
    }
    onChange([
      ...new Set([
        ...phones,
        ...normalized.filter((value): value is string => value !== null),
      ]),
    ]);
    setDraft("");
    setError("");
  }
  return (
    <section className="space-y-3 border-t border-slate-100 pt-5">
      <div className="flex items-center gap-2">
        <ShieldCheck size={17} className="text-violet-600" />
        <label
          htmlFor={inputId}
          className="text-sm font-semibold text-slate-900"
        >
          Захиалах эрх
        </label>
        <span className="ml-auto rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
          {phones.length} хэрэглэгч
        </span>
      </div>
      <p className="text-xs leading-5 text-slate-500">
        Бүртгэлтэй хэрэглэгчийн дугаарыг нэмнэ үү. Өөрчлөлт хадгалсны дараа эрх
        үйлчилнэ.
      </p>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Phone
            size={15}
            aria-hidden
            className="pointer-events-none absolute left-3 top-3 text-slate-400"
          />
          <input
            id={inputId}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={`${inputId}-help`}
            placeholder="99112233"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
          />
        </div>
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-50 px-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-40"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Нэмэх</span>
          <span className="sr-only sm:hidden">Дугаар нэмэх</span>
        </button>
      </div>
      <p
        id={`${inputId}-help`}
        className={`text-xs ${error ? "text-red-600" : "text-slate-400"}`}
        role={error ? "alert" : undefined}
      >
        {error ||
          "Олон дугаар нэмэхдээ таслал эсвэл шинэ мөрөөр тусгаарлаарай."}
      </p>
      <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
        {phones.map((phone) => (
          <span
            key={phone}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white py-1 pl-2.5 pr-1 text-sm tabular-nums text-slate-700"
          >
            <Check size={13} className="text-violet-500" />
            {phone}
            <button
              type="button"
              aria-label={`${phone} дугаарыг хасах`}
              onClick={() =>
                onChange(phones.filter((value) => value !== phone))
              }
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <X size={13} />
            </button>
          </span>
        ))}
      </div>
      {!phones.length && (
        <p className="rounded-xl border border-dashed border-amber-200 bg-amber-50/60 px-3 py-2.5 text-xs leading-5 text-amber-800">
          Дугаар нэмээгүй байна. Каталог харагдах боловч захиалга хийх эрх
          хаалттай.
        </p>
      )}
    </section>
  );
}
