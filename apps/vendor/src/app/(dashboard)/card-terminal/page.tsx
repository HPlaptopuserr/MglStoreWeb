"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { API, authFetch } from "@/lib/api";

type CardTerminalRequest = {
  id: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  providerType: string;
  businessNote: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  cardTerminalId: string | null;
  terminalBridgeUrl: string | null;
  createdAt: string;
};

const PROVIDERS = [
  { value: "MINUPOS", label: "Мину Пос" },
  { value: "MONPAY", label: "МонПэй" },
  { value: "GOLOMT", label: "Голомт банк" },
  { value: "TDB", label: "Худалдаа хөгжлийн банк (TDB)" },
  { value: "KHAAN", label: "Хаан банк" },
  { value: "KHAS", label: "Хас банк" },
  { value: "OTHER", label: "Бусад" },
];

const STATUS_CONFIG = {
  PENDING: {
    label: "Хянагдаж байна",
    icon: Clock,
    cardCls: "border-amber-200 bg-amber-50",
    badgeCls: "bg-amber-100 text-amber-700",
    iconCls: "text-amber-500",
  },
  APPROVED: {
    label: "Зөвшөөрөгдсөн",
    icon: CheckCircle2,
    cardCls: "border-emerald-200 bg-emerald-50",
    badgeCls: "bg-emerald-100 text-emerald-700",
    iconCls: "text-emerald-500",
  },
  REJECTED: {
    label: "Татгалзсан",
    icon: XCircle,
    cardCls: "border-red-200 bg-red-50",
    badgeCls: "bg-red-100 text-red-700",
    iconCls: "text-red-500",
  },
};

export default function CardTerminalPage() {
  const [requests, setRequests] = useState<CardTerminalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    providerType: "",
    businessNote: "",
  });

  const fetchRequests = async () => {
    try {
      const res = await authFetch(`${API}/vendor/card-terminal-requests/my`);
      if (res.ok) setRequests(await res.json());
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!form.contactName.trim() || !form.contactPhone.trim() || !form.providerType) {
      setError("Нэр, утас, үйлчилгээ үзүүлэгч заавал бөглөнө үү");
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch(`${API}/vendor/card-terminal-requests`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Алдаа гарлаа"); return; }
      setSuccess("Хүсэлт амжилттай илгээгдлээ. Ажилтнууд тантай холбогдох болно.");
      setShowForm(false);
      setForm({ contactName: "", contactPhone: "", contactEmail: "", providerType: "", businessNote: "" });
      await fetchRequests();
    } catch {
      setError("Сүлжээний алдаа гарлаа");
    } finally {
      setSubmitting(false);
    }
  };

  const latestRequest = requests[0] ?? null;
  const hasActiveRequest =
    latestRequest && (latestRequest.status === "PENDING" || latestRequest.status === "APPROVED");

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-[#FFAD02]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2 md:space-y-8">

      {/* Back */}
      <div>
        <Link
          href="/requests"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Буцах
        </Link>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-slate-100 p-6 md:p-8">
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-blue-200/50 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 left-10 h-32 w-32 rounded-full bg-indigo-200/30 blur-2xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-300 bg-white/90 px-3 py-1">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-black tracking-wide text-blue-700">CARD TERMINAL</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Card Terminal</h1>
            <p className="mt-2 max-w-xl text-sm font-medium text-slate-600 md:text-base">
              Картаар төлбөр хүлээн авах terminal холбоход хүсэлт илгээнэ.
            </p>
          </div>
          <div className={`flex items-center gap-3 rounded-2xl px-5 py-4 shadow-lg ${
            latestRequest?.status === "APPROVED"
              ? "bg-emerald-500 text-white shadow-emerald-200"
              : latestRequest?.status === "PENDING"
              ? "bg-amber-400 text-black shadow-amber-200"
              : "bg-slate-900 text-white shadow-black/20"
          }`}>
            <CreditCard className="h-6 w-6 opacity-80 shrink-0" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">Төлөв</p>
              <p className="text-sm font-black">
                {latestRequest?.status === "APPROVED"
                  ? "Холбогдсон"
                  : latestRequest?.status === "PENDING"
                  ? "Хянагдаж байна"
                  : "Тохируулаагүй"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Success message */}
      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-800">{success}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">

        {/* How it works */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-5">
            <h3 className="mb-4 text-sm font-black text-blue-900">Хэрхэн ажилладаг вэ?</h3>
            <ol className="space-y-3">
              {[
                "Доорх формыг бөглөж хүсэлтээ илгээнэ",
                "Ажилтнууд таны мэдээллийг card terminal компанид дамжуулна",
                "Terminal компани таны мэдээллийг шалгаад credentials олгоно",
                "Credentials-аа POS системд оруулж terminal холбогдоно",
              ].map((step, i) => (
                <li key={i} className="flex gap-3 text-xs text-blue-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Submit form */}
          {!hasActiveRequest && (
            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setShowForm((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100">
                    <Send className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">Card terminal хүсэлт илгээх</span>
                </div>
                {showForm
                  ? <ChevronUp className="h-4 w-4 text-slate-400" />
                  : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>

              {showForm && (
                <form onSubmit={handleSubmit} className="px-5 pb-5 pt-4 space-y-4 border-t border-slate-100">
                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Card terminal компани <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.providerType}
                      onChange={(e) => setForm((f) => ({ ...f, providerType: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      required
                    >
                      <option value="">Сонгоно уу...</option>
                      {PROVIDERS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">
                        Холбоо барих нэр <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.contactName}
                        onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                        placeholder="Таны нэр"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">
                        Утас <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={form.contactPhone}
                        onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                        placeholder="99001234"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">И-мэйл</label>
                    <input
                      type="email"
                      value={form.contactEmail}
                      onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                      placeholder="example@mail.com"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Нэмэлт мэдээлэл</label>
                    <textarea
                      value={form.businessNote}
                      onChange={(e) => setForm((f) => ({ ...f, businessNote: e.target.value }))}
                      placeholder="Бизнесийн төрөл, байршил гэх мэт..."
                      rows={3}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm py-2.5 px-4 rounded-xl transition-colors"
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Илгээж байна...</>
                    ) : (
                      <><Send className="h-4 w-4" /> Хүсэлт илгээх</>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {hasActiveRequest && latestRequest?.status === "PENDING" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 text-center font-medium">
              Хүсэлт хянагдаж байна. Шийдвэр гарсны дараа энд харагдана.
            </div>
          )}
        </div>

        {/* Request history */}
        <div className="lg:col-span-3">
          {requests.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-20 text-center">
              <CreditCard className="mx-auto h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-500">Одоогоор хүсэлт байхгүй байна.</p>
              <p className="text-xs text-slate-400 mt-1">Зүүн талын формоор хүсэлт илгээнэ үү.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-sm font-black text-slate-700 px-1">Хүсэлтийн түүх</h2>
              {requests.map((req) => {
                const cfg = STATUS_CONFIG[req.status];
                const StatusIcon = cfg.icon;
                const provider = PROVIDERS.find((p) => p.value === req.providerType)?.label ?? req.providerType;
                return (
                  <div key={req.id} className={`rounded-2xl border p-5 space-y-3 ${cfg.cardCls}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-5 w-5 ${cfg.iconCls}`} />
                        <span className="font-bold text-slate-800">{provider}</span>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badgeCls}`}>
                        {cfg.label}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 space-y-0.5">
                      <p>Холбоо барих: {req.contactName} · {req.contactPhone}</p>
                      <p>Илгээсэн: {new Date(req.createdAt).toLocaleDateString("mn-MN")}</p>
                    </div>

                    {req.status === "APPROVED" && req.cardTerminalId && (
                      <div className="rounded-xl bg-white border border-emerald-200 p-3.5 space-y-1.5">
                        <p className="text-xs font-black text-slate-700">Terminal мэдээлэл</p>
                        <p className="text-xs">
                          <span className="font-semibold text-slate-600">Terminal ID: </span>
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-900">{req.cardTerminalId}</span>
                        </p>
                        {req.terminalBridgeUrl && (
                          <p className="text-xs">
                            <span className="font-semibold text-slate-600">Bridge URL: </span>
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-900 break-all">{req.terminalBridgeUrl}</span>
                          </p>
                        )}
                        <p className="text-xs text-emerald-700 mt-1 font-medium">
                          Эдгээр мэдээллийг POS тохиргоонд оруулж terminal холбогдоно.
                        </p>
                      </div>
                    )}

                    {req.adminNote && (
                      <div className="text-xs bg-white/60 rounded-xl px-3 py-2 border border-slate-200">
                        <span className="font-semibold">Тэмдэглэл:</span> {req.adminNote}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
