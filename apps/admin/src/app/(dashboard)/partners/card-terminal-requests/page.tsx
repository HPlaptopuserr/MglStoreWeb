"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Save,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { API, adminFetch } from "@/lib/api";

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
  organization: {
    id: string;
    name: string;
    slug: string;
    phone: string | null;
    email: string | null;
    taxId: string;
  };
  reviewedBy: {
    id: string;
    email: string;
    profile: { fullName: string } | null;
  } | null;
};

const PROVIDERS: Record<string, string> = {
  MONPAY: "МонПэй",
  GOLOMT: "Голомт банк",
  TDB: "Худалдаа хөгжлийн банк (TDB)",
  KHAAN: "Хаан банк",
  KHAS: "Хас банк",
  OTHER: "Бусад",
};

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Бүгд" },
  { value: "PENDING", label: "Хянагдаж байна" },
  { value: "APPROVED", label: "Зөвшөөрөгдсөн" },
  { value: "REJECTED", label: "Татгалзсан" },
];

function ApprovePanel({
  request,
  onDone,
}: {
  request: CardTerminalRequest;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [cardTerminalId, setCardTerminalId] = useState("");
  const [terminalBridgeUrl, setTerminalBridgeUrl] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (action === "APPROVED" && !cardTerminalId.trim()) {
      setError("Card Terminal ID оруулна уу");
      return;
    }
    setSaving(true);
    try {
      const res = await adminFetch(`${API}/admin/card-terminal-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action,
          cardTerminalId: cardTerminalId.trim() || undefined,
          terminalBridgeUrl: terminalBridgeUrl.trim() || undefined,
          adminNote: adminNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Алдаа гарлаа");
        return;
      }
      setOpen(false);
      onDone();
    } catch {
      setError("Сүлжээний алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
      >
        Шийдвэр гаргах
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setAction("APPROVED")}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                action === "APPROVED"
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              Зөвшөөрөх
            </button>
            <button
              onClick={() => setAction("REJECTED")}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                action === "REJECTED"
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              Татгалзах
            </button>
          </div>

          {action === "APPROVED" && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Card Terminal ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={cardTerminalId}
                  onChange={(e) => setCardTerminalId(e.target.value)}
                  placeholder="Terminal ID (card terminal компаниас авсан)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Bridge URL</label>
                <input
                  type="url"
                  value={terminalBridgeUrl}
                  onChange={(e) => setTerminalBridgeUrl(e.target.value)}
                  placeholder="http://... (заавал биш)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Admin тэмдэглэл</label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Vendor-т харагдах нэмэлт тайлбар..."
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Хадгалах
          </button>
        </div>
      )}
    </div>
  );
}

export default function CardTerminalRequestsPage() {
  const [requests, setRequests] = useState<CardTerminalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const url = statusFilter
        ? `${API}/admin/card-terminal-requests?status=${statusFilter}`
        : `${API}/admin/card-terminal-requests`;
      const res = await adminFetch(url);
      if (res.ok) {
        setRequests(await res.json());
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const statusConfig = {
    PENDING: {
      label: "Хянагдаж байна",
      icon: <Clock className="w-4 h-4 text-yellow-500" />,
      badgeColor: "bg-yellow-100 text-yellow-700",
    },
    APPROVED: {
      label: "Зөвшөөрөгдсөн",
      icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
      badgeColor: "bg-green-100 text-green-700",
    },
    REJECTED: {
      label: "Татгалзсан",
      icon: <XCircle className="w-4 h-4 text-red-500" />,
      badgeColor: "bg-red-100 text-red-700",
    },
  };

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <CreditCard className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Card Terminal хүсэлтүүд</h1>
            <p className="text-sm text-gray-500">Vendor-уудын card terminal үйлчилгээний хүсэлтүүд</p>
          </div>
          {pendingCount > 0 && (
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {pendingCount} хүлээгдэж буй
            </span>
          )}
        </div>
        <Link
          href="/partners"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Партнерүүд руу буцах
        </Link>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              statusFilter === opt.value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Хүсэлт байхгүй байна</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const cfg = statusConfig[req.status];
            const provider = PROVIDERS[req.providerType] ?? req.providerType;

            return (
              <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/partners/${req.organizationId}`}
                        className="font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {req.organization.name}
                      </Link>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-sm text-gray-600">{provider}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {req.organization.taxId}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {req.contactPhone}
                      </span>
                      {req.contactEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          {req.contactEmail}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {cfg.icon}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badgeColor}`}>
                      {cfg.label}
                    </span>
                  </div>
                </div>

                {/* Business note */}
                {req.businessNote && (
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                    {req.businessNote}
                  </p>
                )}

                {/* Credentials (if approved) */}
                {req.status === "APPROVED" && req.cardTerminalId && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs space-y-1">
                    <p className="font-semibold text-green-800">Олгосон credentials</p>
                    <p className="text-green-700">
                      Terminal ID: <span className="font-mono bg-white px-1 rounded">{req.cardTerminalId}</span>
                    </p>
                    {req.terminalBridgeUrl && (
                      <p className="text-green-700 break-all">
                        Bridge URL: <span className="font-mono bg-white px-1 rounded">{req.terminalBridgeUrl}</span>
                      </p>
                    )}
                  </div>
                )}

                {req.adminNote && (
                  <p className="text-xs text-gray-500 italic">Тэмдэглэл: {req.adminNote}</p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Илгээсэн: {new Date(req.createdAt).toLocaleString("mn-MN")}</span>
                  {req.reviewedAt && (
                    <span>Шийдвэрлэсэн: {new Date(req.reviewedAt).toLocaleString("mn-MN")}</span>
                  )}
                </div>

                {req.status === "PENDING" && (
                  <ApprovePanel request={req} onDone={fetchRequests} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
