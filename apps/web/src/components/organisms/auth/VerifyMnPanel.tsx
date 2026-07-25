"use client";

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  MessageSquareText,
  Send,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useState } from "react";

export type VerifyMnSession = {
  sessionId: string;
  phone: string;
  shortcode: string;
  text: string;
  smsUri: string;
  displayInstruction: string;
  expiresAt: string;
};

type VerifyMnPanelProps = {
  session: VerifyMnSession;
  remainingSeconds: number;
  timeText: string;
  loading: boolean;
  error?: string;
  onRestart: () => void;
  onVerify: () => void;
};

export function VerifyMnPanel({
  session,
  remainingSeconds,
  timeText,
  loading,
  error,
  onRestart,
  onVerify,
}: VerifyMnPanelProps) {
  const isExpired = remainingSeconds <= 0;
  const [copied, setCopied] = useState(false);
  const [smsOpened, setSmsOpened] = useState(false);

  const handleCopySmsText = async () => {
    try {
      await navigator.clipboard.writeText(session.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Мэдээлэл засах
        </button>
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
          <ShieldCheck className="h-4 w-4" />
          Verify.mn
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">
          Утасны дугаараа баталгаажуулна уу
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Таны утас руу код ирэхгүй. Доорх кодыг заасан тусгай дугаар руу
          <span className="font-bold text-slate-800"> өөрөө SMS-ээр илгээнэ.</span>
        </p>
      </div>

      <ol className="grid grid-cols-3 gap-2" aria-label="Баталгаажуулах алхам">
        {[
          { label: "Код авах", done: true },
          { label: "SMS илгээх", done: smsOpened },
          { label: "Шалгах", done: false },
        ].map((step, index) => (
          <li key={step.label} className="min-w-0">
            <div className={`mb-2 h-1 rounded-full ${step.done ? "bg-emerald-500" : "bg-slate-200"}`} />
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                  step.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {step.done ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              <span className="truncate text-[11px] font-bold text-slate-600">{step.label}</span>
            </div>
          </li>
        ))}
      </ol>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <Smartphone className="h-4 w-4 text-emerald-600" />
            {session.phone}
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
              isExpired ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {isExpired ? "Хугацаа дууссан" : timeText}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Илгээх дугаар
            </p>
            <p className="mt-1 text-xl font-black tracking-tight text-slate-950">{session.shortcode}</p>
          </div>
          <Send className="h-4 w-4 text-slate-300" />
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              SMS код
            </p>
            <p className="mt-1 font-mono text-xl font-black tracking-[0.12em] text-slate-950">
              {session.text}
            </p>
          </div>
        </div>
      </div>

      {isExpired ? (
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-slate-800"
        >
          Дахин эхлүүлэх
        </button>
      ) : (
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <button
            type="button"
            onClick={handleCopySmsText}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
            aria-label="SMS код хуулах"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            <span className="hidden sm:inline">{copied ? "Хуулагдлаа" : "Код хуулах"}</span>
          </button>
          <a
            href={session.smsUri}
            onClick={() => setSmsOpened(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-200 transition-all hover:-translate-y-0.5 hover:bg-slate-800"
          >
            <MessageSquareText className="h-4 w-4" />
            SMS илгээх
          </a>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
          <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-bold">{error}</p>
            <p className="mt-1 text-xs text-amber-700">
              SMS амжилттай илгээгдсэн бол хэдэн секунд хүлээгээд дахин шалгана уу. Таны оруулсан мэдээлэл хадгалагдсан.
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onVerify}
        disabled={loading || isExpired}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-100 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {loading ? "Шалгаж байна..." : "Баталгаажуулалт шалгах"}
      </button>
    </div>
  );
}
