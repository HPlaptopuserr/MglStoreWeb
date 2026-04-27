"use client";

import { Check, Copy, Loader2, ShieldCheck } from "lucide-react";
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
    <div className="space-y-4">
      <div className="text-center mb-2">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={28} className="text-blue-500" />
        </div>
        <h2 className="text-xl font-black text-gray-900">Утас баталгаажуулах</h2>
        <p className="text-sm text-gray-500 mt-1">
          Доорх SMS-г илгээсний дараа шалгах товчийг дарна уу.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="mb-4 flex items-center justify-between rounded-lg bg-white px-3 py-2">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Үлдсэн хугацаа</span>
          <span className={`text-sm font-black ${isExpired ? "text-red-600" : "text-emerald-600"}`}>
            {isExpired ? "Дууссан" : timeText}
          </span>
        </div>
        <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Илгээх дугаар</p>
        <p className="mt-1 text-2xl font-black text-gray-900">{session.shortcode}</p>
        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-amber-700">SMS текст</p>
        <p className="mt-1 rounded-lg bg-white px-3 py-2 text-base font-bold text-gray-900">
          {session.text}
        </p>
      </div>

      {isExpired ? (
        <button
          type="button"
          onClick={onRestart}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-gray-800"
        >
          Дахин эхлүүлэх
        </button>
      ) : (
        <button
          type="button"
          onClick={handleCopySmsText}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-gray-800"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Хуулагдлаа" : "SMS текст хуулах"}
        </button>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={onVerify}
        disabled={loading || isExpired}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:from-amber-600 hover:to-orange-700 disabled:opacity-70"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {loading ? "Шалгаж байна..." : "Баталгаажуулалт шалгах"}
      </button>
    </div>
  );
}
