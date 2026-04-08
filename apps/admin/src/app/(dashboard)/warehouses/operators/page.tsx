"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  Search,
  Loader2,
  X,
  Copy,
  CheckCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Warehouse,
  User,
  Mail,
  Phone,
  Hash,
} from "lucide-react";
import { API, adminFetch } from "@/lib/api";

interface WarehouseOption {
  id: string;
  name: string;
  city: string;
}

interface OperatorData {
  userId: string;
  operatorId: string;
  email: string;
  setupLink: string;
  expiresAt: string;
}

export default function WarehouseOperatorsPage() {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Register modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    warehouseId: "",
  });
  const [registerResult, setRegisterResult] = useState<OperatorData | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Regenerate
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratedLink, setRegeneratedLink] = useState("");

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const res = await adminFetch(`${API}/warehouses`);
      if (res.ok) {
        const data = await res.json();
        setWarehouses(
          (data || []).map((w: any) => ({
            id: w.id,
            name: w.name,
            city: w.city || "",
          })),
        );
      }
    } catch (error) {
      console.error("Failed to fetch warehouses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.warehouseId) {
      setError("Нэр, имэйл, агуулах сонгоно уу");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await adminFetch(`${API}/warehouse-setup/register`, {
        method: "POST",
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Алдаа гарлаа");
        setIsSubmitting(false);
        return;
      }

      setRegisterResult(data.data);
    } catch {
      setError("Серверт холбогдож чадсангүй");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = link;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerateToken = async () => {
    if (!registerResult) return;

    setIsRegenerating(true);
    try {
      const res = await adminFetch(`${API}/warehouse-setup/regenerate-token`, {
        method: "POST",
        body: JSON.stringify({
          userId: registerResult.userId,
          warehouseId: formData.warehouseId,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setRegeneratedLink(data.data.setupLink);
        setRegisterResult({
          ...registerResult,
          setupLink: data.data.setupLink,
          expiresAt: data.data.expiresAt,
        });
      } else {
        setError(data.message || "Token шинэчлэхэд алдаа гарлаа");
      }
    } catch {
      setError("Серверт холбогдож чадсангүй");
    } finally {
      setIsRegenerating(false);
    }
  };

  const resetModal = () => {
    setShowRegisterModal(false);
    setFormData({ fullName: "", email: "", phoneNumber: "", warehouseId: "" });
    setRegisterResult(null);
    setError("");
    setCopied(false);
    setRegeneratedLink("");
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#5B4CFF]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Агуулахын оператор бүртгэл
          </h1>
          <p className="text-sm text-slate-500">
            Агуулахын ажилтнуудыг бүртгэх, нууц үг тохируулах линк үүсгэх
          </p>
        </div>
        <button
          onClick={() => setShowRegisterModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#5B4CFF] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#5B4CFF]/90 hover:shadow-lg"
        >
          <UserPlus className="h-5 w-5" />
          Оператор бүртгэх
        </button>
      </div>

      {/* Info Card */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
        <h3 className="font-semibold text-blue-900">Бүртгэлийн үйл явц:</h3>
        <ol className="mt-3 space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-bold">1</span>
            <span>Оператор бүртгэх товч дарж мэдээлэл оруулна</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-bold">2</span>
            <span>Систем 8 оронтой ID автоматаар үүсгэнэ</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-bold">3</span>
            <span>Нууц үг тохируулах линк үүснэ (5 минутын хугацаатай)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-bold">4</span>
            <span>Линкийг операторт илгээнэ → нууц үг тохируулна → WMS-д нэвтрэнэ</span>
          </li>
        </ol>
      </div>

      {/* Warehouses Grid */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Агуулахууд</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {warehouses.map((w) => (
            <div
              key={w.id}
              className="rounded-2xl border border-slate-100 bg-white p-6 transition-all hover:border-slate-200 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[#5B4CFF]/10 p-3">
                  <Warehouse className="h-6 w-6 text-[#5B4CFF]" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{w.name}</h3>
                  <p className="text-sm text-slate-500">{w.city}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFormData((prev) => ({ ...prev, warehouseId: w.id }));
                  setShowRegisterModal(true);
                }}
                className="mt-4 w-full rounded-lg border border-[#5B4CFF]/30 py-2 text-sm font-medium text-[#5B4CFF] transition-all hover:bg-[#5B4CFF]/5"
              >
                <UserPlus className="mr-2 inline h-4 w-4" />
                Оператор нэмэх
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                {registerResult ? "Бүртгэл амжилттай" : "Шинэ оператор бүртгэх"}
              </h2>
              <button
                onClick={resetModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form (before registration) */}
            {!registerResult && (
              <>
                <div className="p-6 space-y-4">
                  {error && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <User className="h-4 w-4" />
                      Нэр <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Операторын бүтэн нэр"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#5B4CFF] focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/20"
                    />
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Mail className="h-4 w-4" />
                      Имэйл <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="operator@example.com"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#5B4CFF] focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/20"
                    />
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Phone className="h-4 w-4" />
                      Утасны дугаар
                    </label>
                    <input
                      type="text"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="9900 0000"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#5B4CFF] focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/20"
                    />
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Warehouse className="h-4 w-4" />
                      Агуулах <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.warehouseId}
                      onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#5B4CFF] focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/20"
                    >
                      <option value="">Агуулах сонгоно уу</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} — {w.city}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
                  <button
                    onClick={resetModal}
                    className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Болих
                  </button>
                  <button
                    onClick={handleRegister}
                    disabled={!formData.fullName.trim() || !formData.email.trim() || !formData.warehouseId || isSubmitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#5B4CFF] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#5B4CFF]/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Бүртгэх
                  </button>
                </div>
              </>
            )}

            {/* Result (after registration) */}
            {registerResult && (
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3 rounded-xl bg-green-50 p-4">
                  <CheckCircle className="h-6 w-6 shrink-0 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800">Амжилттай бүртгэгдлээ!</p>
                    <p className="text-sm text-green-700">Доорх линкийг операторт илгээнэ үү</p>
                  </div>
                </div>

                {/* Operator Info */}
                <div className="rounded-xl bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Оператор ID:</span>
                    <span className="flex items-center gap-2 font-mono text-lg font-bold text-[#5B4CFF]">
                      <Hash className="h-4 w-4" />
                      {registerResult.operatorId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Имэйл:</span>
                    <span className="text-sm font-medium text-slate-900">{registerResult.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Хугацаа:</span>
                    <span className="flex items-center gap-1 text-sm font-medium text-amber-600">
                      <Clock className="h-4 w-4" />
                      5 минут
                    </span>
                  </div>
                </div>

                {/* Setup Link */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Нууц үг тохируулах линк:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={registerResult.setupLink}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-mono text-slate-700"
                    />
                    <button
                      onClick={() => handleCopyLink(registerResult.setupLink)}
                      className={`shrink-0 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                        copied
                          ? "bg-green-100 text-green-700"
                          : "bg-[#5B4CFF] text-white hover:bg-[#5B4CFF]/90"
                      }`}
                    >
                      {copied ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleRegenerateToken}
                    disabled={isRegenerating}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50"
                  >
                    {isRegenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Шинэ линк үүсгэх
                  </button>
                  <button
                    onClick={resetModal}
                    className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-200"
                  >
                    Хаах
                  </button>
                </div>

                <p className="text-center text-xs text-amber-600">
                  ⚠ Линк 5 минутын хугацаатай. Хугацаа дуусвал &quot;Шинэ линк үүсгэх&quot; товч дарна уу.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
