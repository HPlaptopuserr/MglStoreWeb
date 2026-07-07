"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  AlertCircle,
  BadgePercent,
  CheckCircle2,
  Copy,
  Loader2,
} from "lucide-react";
import { API } from "@/lib/api";

type CreatedAgent = {
  code: string;
  fullName: string;
  phone: string;
  email: string | null;
  commissionRate: number | string;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";

export default function AssociationAgentPage() {
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    code: "",
  });
  const [agent, setAgent] = useState<CreatedAgent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const membershipUrl = useMemo(() => {
    if (!agent?.code || typeof window === "undefined") return "";
    return `${window.location.origin}/profile?ref=${encodeURIComponent(agent.code)}`;
  }, [agent?.code]);

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: key === "code" ? value.toUpperCase() : value,
    }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/association/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          code: form.code.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message || "Agent code үүсгэхэд алдаа гарлаа");
        return;
      }
      setAgent(data.agent);
    } catch {
      setError("Сүлжээний алдаа гарлаа");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!membershipUrl) return;
    await navigator.clipboard.writeText(membershipUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-lg space-y-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
            <BadgePercent size={20} />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">
              Membership agent
            </p>
            <h1 className="text-xl font-black text-slate-950">
              Agent code авах
            </h1>
          </div>
        </div>

        {agent ? (
          <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={24} />
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Code бэлэн боллоо
                </h2>
                <p className="text-sm font-semibold text-slate-500">
                  Энэ code-оор төлбөр төлсөн гишүүд таны нэр дээр бүртгэгдэнэ.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">
                Таны agent code
              </p>
              <p className="mt-1 text-3xl font-black tracking-widest text-indigo-700">
                {agent.code}
              </p>
              <p className="mt-2 text-xs font-semibold text-indigo-700">
                Commission хувь: {Number(agent.commissionRate).toLocaleString()}
                %
              </p>
            </div>
            <button
              type="button"
              onClick={copyLink}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              <Copy size={16} />
              {copied ? "Хуулагдлаа" : "Membership link хуулах"}
            </button>
            {membershipUrl && (
              <p className="mt-2 break-all rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                {membershipUrl}
              </p>
            )}
          </section>
        ) : (
          <form
            onSubmit={submit}
            className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <Field label="Нэр" required>
              <input
                value={form.fullName}
                onChange={(event) => update("fullName", event.target.value)}
                className={inputClass}
                placeholder="Овог нэр"
                required
              />
            </Field>
            <Field label="Утас" required>
              <input
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
                className={inputClass}
                placeholder="99001234"
                type="tel"
                required
              />
            </Field>
            <Field label="Имэйл">
              <input
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                className={inputClass}
                placeholder="name@example.com"
                type="email"
              />
            </Field>
            <Field label="Өөрийн хүссэн code">
              <input
                value={form.code}
                onChange={(event) => update("code", event.target.value)}
                className={`${inputClass} uppercase`}
                placeholder="Хоосон үлдээвэл автоматаар үүснэ"
              />
            </Field>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Agent code авах
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

function Field({
  children,
  label,
  required,
}: {
  children: React.ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
