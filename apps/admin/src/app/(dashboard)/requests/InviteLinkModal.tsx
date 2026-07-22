"use client";

import { Check, CheckCircle, Copy, Link as LinkIcon } from "lucide-react";
import { useState } from "react";

export interface InviteLinkData {
  show: boolean;
  link: string;
  orgName: string;
  email: string;
}

export function InviteLinkModal({
  data,
  onClose,
}: {
  data: InviteLinkData;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(data.link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Амжилттай зөвшөөрөгдлөө!
            </h3>
            <p className="text-sm text-slate-500">{data.orgName}</p>
          </div>
        </div>
        <div className="mb-4 rounded-xl bg-slate-50 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
            <LinkIcon size={16} />
            Нууц үг тохируулах линк
          </p>
          <p className="mb-3 text-xs text-slate-500">
            Энэ линкийг <strong>{data.email}</strong> хаягт илгээнэ үү. Линк 24
            цагийн дотор хүчинтэй.
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={data.link}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
            />
            <button
              type="button"
              onClick={() => void copy()}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${copied ? "bg-emerald-100 text-emerald-700" : "bg-indigo-600 text-white"}`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Хуулсан" : "Хуулах"}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
        >
          Хаах
        </button>
      </div>
    </div>
  );
}
