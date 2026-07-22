"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Briefcase,
  Building,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  ExternalLink,
  FileCheck,
  Files,
  FileText,
  Filter,
  Globe,
  Hash,
  Layers,
  Mail,
  MapPin,
  Maximize2,
  Package,
  PenTool,
  Phone,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Upload,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { adminFetch } from "@/lib/api";
import {
  ContractArchiveFilters,
  ContractArchiveHeader,
  ContractStatusCards,
} from "@/components/organisms/contracts/ContractArchiveShell";
import { API, WEB } from "./contracts.config";
import {
  ContractNameCell,
  ExpiryBadge,
  getContractCode,
  getContractDisplayName,
  statusDays,
  type SortKey,
  type Submission,
} from "./contracts.model";

export function RegisterScannedModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [org, setOrg] = useState("");
  const [register, setRegister] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [director, setDirector] = useState("");
  const [position, setPosition] = useState("Захирал");
  const [feePlan, setFeePlan] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [contractName, setContractName] = useState("");
  const [signedAt, setSignedAt] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const feePlans = useMemo(() => {
    if (!selectedTemplateId) return [];
    const t = templates.find((temp) => temp.id === selectedTemplateId);
    if (!t) return [];
    return t.headerData?.feePlans || [];
  }, [selectedTemplateId, templates]);

  useEffect(() => {
    adminFetch(`${API}/contracts`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setTemplates(d.contracts || []);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) {
      setError("Байгууллагын нэр шаардлагатай");
      return;
    }
    if (!file) {
      setError("Гэрээний файл оруулах шаардлагатай");
      return;
    }
    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("org", org);
    if (selectedTemplateId) formData.append("templateId", selectedTemplateId);
    if (register) formData.append("register", register);
    if (phone) formData.append("phone", phone);
    if (email) formData.append("email", email);
    if (director) formData.append("director", director);
    if (position) formData.append("position", position);
    if (feePlan) formData.append("feePlan", feePlan);
    if (contractNumber) formData.append("contractNumber", contractNumber);
    if (contractName) formData.append("contractName", contractName);
    if (signedAt) formData.append("signedAt", signedAt);
    if (expiresAt) formData.append("expiresAt", expiresAt);

    try {
      const res = await adminFetch(`${API}/contracts/scanned/register`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || "Бүртгэхэд алдаа гарлаа");
      }
    } catch (err) {
      setError("Холболтын алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#1e4e8c] text-white">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Upload className="w-5 h-5" /> Скандсан гэрээ бүртгэх
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 flex flex-col gap-4"
        >
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Байгууллагын нэр <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder="Жишээ: Юнител ХХК"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                Гэрээний нэр
              </label>
              <input
                type="text"
                value={contractName}
                onChange={(e) => setContractName(e.target.value)}
                placeholder="Жишээ: Хамтын ажиллагааны гэрээ"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                Гэрээний дугаар
              </label>
              <input
                type="text"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                placeholder="Жишээ: CNT-2026-001"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                Регистрийн дугаар
              </label>
              <input
                type="text"
                value={register}
                onChange={(e) => setRegister(e.target.value)}
                placeholder="8 оронтой тоо"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                Гүйцэтгэх захирал
              </label>
              <input
                type="text"
                value={director}
                onChange={(e) => setDirector(e.target.value)}
                placeholder="Захирлын нэр"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                Албан тушаал
              </label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Жишээ: Захирал"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                Утас
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Утасны дугаар"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              И-мэйл
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Шуудангийн хаяг"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                Хийгдсэн огноо
              </label>
              <input
                type="date"
                value={signedAt}
                onChange={(e) => setSignedAt(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50 text-slate-600 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                Дуусах огноо
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50 text-slate-600 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                Гэрээний загвар
              </label>
              <div className="relative">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => {
                    setSelectedTemplateId(e.target.value);
                    setFeePlan("");
                  }}
                  className="w-full py-2.5 pl-3 pr-8 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50 text-slate-650 font-medium appearance-none cursor-pointer"
                >
                  <option value="">Сонгохгүй (Бие даасан)</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.org} - MGL-{t.id.slice(0, 6).toUpperCase()}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                Багц сонгох
              </label>
              <div className="relative">
                <select
                  value={feePlan}
                  onChange={(e) => setFeePlan(e.target.value)}
                  disabled={!selectedTemplateId}
                  className="w-full py-2.5 pl-3 pr-8 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50 text-slate-650 font-medium appearance-none cursor-pointer disabled:opacity-50"
                >
                  <option value="">Багц байхгүй</option>
                  {feePlans.map((p: any) => (
                    <option key={p.key} value={p.key}>
                      {p.label} - {Number(p.price || 0).toLocaleString()}₮
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Сканнердсан файл <span className="text-rose-500">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/30 flex flex-col items-center justify-center gap-2 relative">
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                required
              />
              <Upload className="w-8 h-8 text-slate-400" />
              {file ? (
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-slate-700 max-w-[300px] truncate">
                    {file.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-bold text-slate-600">
                    Файл оруулах бол энд дарна уу
                  </span>
                  <span className="text-xs text-slate-400">
                    PDF, JPG, PNG эсвэл WebP (макс 15MB)
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex gap-3 justify-end mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Цуцлах
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#1e4e8c] hover:bg-[#163d70] text-white rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 min-w-[120px]"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Уншиж байна...
                </>
              ) : (
                <>Бүртгэх</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
