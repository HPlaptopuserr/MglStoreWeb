"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { API, authFetch } from "@/lib/api";

type CardTerminalRequest = {
  id: string;
  organizationId: string;
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
  reviewedAt: string | null;
};

const PROVIDERS = [
  { value: "MONPAY", label: "МонПэй" },
  { value: "GOLOMT", label: "Голомт банк" },
  { value: "TDB", label: "Худалдаа хөгжлийн банк (TDB)" },
  { value: "KHAAN", label: "Хаан банк" },
  { value: "KHAS", label: "Хас банк" },
  { value: "OTHER", label: "Бусад" },
];

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
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

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

      if (!res.ok) {
        setError(data.message || "Алдаа гарлаа");
        return;
      }

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
    latestRequest &&
    (latestRequest.status === "PENDING" || latestRequest.status === "APPROVED");

  const statusConfig = {
    PENDING: {
      label: "Хянагдаж байна",
      icon: <Clock className="w-5 h-5 text-yellow-500" />,
      color: "bg-yellow-50 border-yellow-200 text-yellow-800",
      badgeColor: "bg-yellow-100 text-yellow-700",
    },
    APPROVED: {
      label: "Зөвшөөрөгдсөн",
      icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
      color: "bg-green-50 border-green-200 text-green-800",
      badgeColor: "bg-green-100 text-green-700",
    },
    REJECTED: {
      label: "Татгалзсан",
      icon: <XCircle className="w-5 h-5 text-red-500" />,
      color: "bg-red-50 border-red-200 text-red-800",
      badgeColor: "bg-red-100 text-red-700",
    },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <CreditCard className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Card Terminal үйлчилгээ</h1>
          <p className="text-sm text-gray-500">Картаар төлбөр хүлээн авах terminal хүсэх</p>
        </div>
      </div>

      {/* Success message */}
      {success && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-blue-900">Хэрхэн ажилладаг вэ?</p>
        <ol className="space-y-2 text-sm text-blue-800">
          <li className="flex gap-2">
            <span className="font-bold shrink-0">1.</span>
            Доорх формыг бөглөж хүсэлтээ илгээнэ
          </li>
          <li className="flex gap-2">
            <span className="font-bold shrink-0">2.</span>
            Манай ажилтнууд таны мэдээллийг card terminal компанид дамжуулна
          </li>
          <li className="flex gap-2">
            <span className="font-bold shrink-0">3.</span>
            Terminal компани таны мэдээллийг шалгаад username/password олгоно
          </li>
          <li className="flex gap-2">
            <span className="font-bold shrink-0">4.</span>
            Та credentials-аа авмагц POS системд оруулж холбогдоно
          </li>
        </ol>
      </div>

      {/* Existing requests */}
      {requests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Хүсэлтийн түүх</h2>
          {requests.map((req) => {
            const cfg = statusConfig[req.status];
            const provider = PROVIDERS.find((p) => p.value === req.providerType)?.label ?? req.providerType;
            return (
              <div key={req.id} className={`border rounded-xl p-4 space-y-3 ${cfg.color}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {cfg.icon}
                    <span className="font-semibold text-sm">{provider}</span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badgeColor}`}>
                    {cfg.label}
                  </span>
                </div>

                <div className="text-xs space-y-1 opacity-80">
                  <p>Холбоо барих: {req.contactName} · {req.contactPhone}</p>
                  <p>Илгээсэн: {new Date(req.createdAt).toLocaleDateString("mn-MN")}</p>
                </div>

                {req.status === "APPROVED" && req.cardTerminalId && (
                  <div className="bg-white rounded-lg p-3 space-y-1.5 border border-green-200">
                    <p className="text-xs font-semibold text-gray-700">Terminal мэдээлэл</p>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">Terminal ID:</span>{" "}
                        <span className="font-mono bg-gray-100 px-1 rounded">{req.cardTerminalId}</span>
                      </p>
                      {req.terminalBridgeUrl && (
                        <p>
                          <span className="font-medium">Bridge URL:</span>{" "}
                          <span className="font-mono bg-gray-100 px-1 rounded break-all">{req.terminalBridgeUrl}</span>
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      Эдгээр мэдээллийг POS тохиргоонд оруулж terminal холбогдоно.
                    </p>
                  </div>
                )}

                {req.adminNote && (
                  <div className="text-xs bg-white/60 rounded-lg p-2 border border-current/20">
                    <span className="font-medium">Тэмдэглэл:</span> {req.adminNote}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Submit form */}
      {!hasActiveRequest && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-sm text-gray-800">Card terminal хүсэлт илгээх</span>
            </div>
            {showForm ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {showForm && (
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card terminal компани <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.providerType}
                  onChange={(e) => setForm((f) => ({ ...f, providerType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Сонгоно уу...</option>
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Холбоо барих нэр <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                  placeholder="Таны нэр"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Утасны дугаар <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                  placeholder="99001234"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">И-мэйл хаяг</label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  placeholder="example@mail.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Нэмэлт мэдээлэл
                </label>
                <textarea
                  value={form.businessNote}
                  onChange={(e) => setForm((f) => ({ ...f, businessNote: e.target.value }))}
                  placeholder="Бизнесийн төрөл, байршил гэх мэт нэмэлт мэдээлэл..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm py-2.5 px-4 rounded-lg transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Илгээж байна...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Хүсэлт илгээх
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}

      {hasActiveRequest && latestRequest?.status === "PENDING" && (
        <div className="text-center py-4 text-sm text-gray-500">
          Хүсэлт хянагдаж байна. Шийдвэр гарсны дараа энд харагдана.
        </div>
      )}
    </div>
  );
}
