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

export function ContractDetailPanel({
  sub,
  onClose,
}: {
  sub: Submission;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"info" | "original">("info");
  const member = sub.memberData as any;
  const days = statusDays(sub.expiresAt);
  const expiring = days !== null && days >= 0 && days <= 30;
  const expired = days !== null && days < 0;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm transition-all duration-300"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 border-l border-slate-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-[#1e4e8c] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight truncate max-w-[450px]">
                {getContractDisplayName(sub)}
              </h2>
              <p className="text-blue-100 text-xs font-semibold mt-0.5 truncate max-w-[450px]">
                {sub.org} · Дугаар: {getContractCode(sub)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 transition-all text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 py-1">
          <button
            onClick={() => setActiveTab("info")}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "info"
                ? "border-b-[#1e4e8c] text-[#1e4e8c]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Ерөнхий мэдээлэл
          </button>
          <button
            onClick={() => setActiveTab("original")}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "original"
                ? "border-b-[#1e4e8c] text-[#1e4e8c]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Гэрээний эх хувь
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {activeTab === "info" ? (
            <div className="flex flex-col gap-6">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {sub.status === "SIGNED" ? (
                  <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Баталгаажсан
                  </span>
                ) : (
                  <span className="px-3.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-150 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                    <Clock className="w-3.5 h-3.5" /> Хүлээгдэж буй
                  </span>
                )}
                {sub.isPaid ? (
                  <span className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-150 rounded-full text-xs font-bold shadow-sm">
                    Төлбөртэй
                  </span>
                ) : (
                  <span className="px-3.5 py-1.5 bg-slate-100 text-slate-650 rounded-full text-xs font-bold shadow-sm">
                    Үнэгүй
                  </span>
                )}
                {expiring && (
                  <span className="px-3.5 py-1.5 bg-orange-50 text-orange-700 border border-orange-150 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                    <AlertTriangle className="w-3 h-3" /> Дуусах дөхсөн
                  </span>
                )}
                {expired && (
                  <span className="px-3.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-150 rounded-full text-xs font-bold shadow-sm">
                    Дууссан
                  </span>
                )}
              </div>

              {/* General Metadata Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Card 1: ID */}
                <div className="bg-white border-l-4 border-l-blue-500 border border-slate-200/60 rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                    <Hash className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Гэрээний дугаар
                    </div>
                    <div className="font-bold text-slate-800 text-sm font-mono mt-0.5">
                      {sub.contractNumber ||
                        `MGL-${sub.id.slice(0, 8).toUpperCase()}`}
                    </div>
                  </div>
                </div>

                {/* Card 2: Plan */}
                <div className="bg-white border-l-4 border-l-indigo-500 border border-slate-200/60 rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Гэрээний багц
                    </div>
                    <div
                      className="font-bold text-slate-850 text-sm mt-0.5 leading-tight truncate max-w-[150px]"
                      title={sub.feePlanLabel || ""}
                    >
                      {sub.feePlanLabel || (
                        <span className="text-slate-400 italic text-xs">
                          Тохируулаагүй
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card 3: Created date */}
                <div className="bg-white border-l-4 border-l-slate-450 border border-slate-200/60 rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <div className="p-2.5 bg-slate-100 text-slate-655 rounded-xl shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Үүсгэсэн огноо
                    </div>
                    <div className="font-bold text-slate-800 text-sm mt-0.5">
                      {new Date(sub.createdAt).toLocaleDateString("mn-MN")}
                    </div>
                  </div>
                </div>

                {/* Card 4: Signed date */}
                <div
                  className={`bg-white border-l-4 border border-slate-200/60 rounded-xl p-4 shadow-sm flex items-center gap-3 ${sub.signedAt ? "border-l-emerald-500" : "border-l-slate-300"}`}
                >
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${sub.signedAt ? "bg-emerald-50 text-emerald-650" : "bg-slate-50 text-slate-400"}`}
                  >
                    <PenTool className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Гарын үсэг зурсан
                    </div>
                    <div className="font-bold text-slate-800 text-sm mt-0.5">
                      {sub.signedAt ? (
                        new Date(sub.signedAt).toLocaleDateString("mn-MN")
                      ) : (
                        <span className="text-slate-400 italic text-xs">
                          Зураагүй
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card 5: Expiry date */}
                <div
                  className={`bg-white border-l-4 border border-slate-200/60 rounded-xl p-4 shadow-sm flex items-center gap-3 ${expired ? "border-l-rose-500" : expiring ? "border-l-amber-500" : "border-l-blue-500"}`}
                >
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${expired ? "bg-rose-50 text-rose-650" : expiring ? "bg-amber-50 text-amber-650" : "bg-blue-50 text-blue-600"}`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Дуусах огноо
                    </div>
                    <div className="font-bold text-slate-800 text-sm mt-0.5">
                      {sub.expiresAt ? (
                        new Date(sub.expiresAt).toLocaleDateString("mn-MN")
                      ) : (
                        <span className="text-slate-400 italic text-xs">
                          Тохируулаагүй
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Company Details */}
              {member && (
                <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                  {/* Header */}
                  <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-[#1e4e8c]/10 text-[#1e4e8c] rounded-lg">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-700 text-sm">
                        Байгууллагын албан ёсны мэдээлэл
                      </span>
                    </div>
                    <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2.5 py-0.5 rounded-full uppercase">
                      Идэвхтэй
                    </span>
                  </div>

                  {/* Form Field Layout */}
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Col 1: General Company info */}
                    <div className="flex flex-col gap-4">
                      <div className="border-b border-slate-100 pb-1.5">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Ерөнхий бүртгэл
                        </h4>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100/80 text-slate-500 rounded-lg shrink-0 mt-0.5">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            Байгууллагын нэр
                          </div>
                          <div className="text-sm font-semibold text-slate-750">
                            {member.name || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100/80 text-slate-500 rounded-lg shrink-0 mt-0.5">
                          <Hash className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            Улсын бүртгэлийн регистр
                          </div>
                          <div className="text-sm font-semibold text-slate-750">
                            {member.register || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100/80 text-slate-500 rounded-lg shrink-0 mt-0.5">
                          <Briefcase className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            Үйл ажиллагааны чиглэл
                          </div>
                          <div className="text-sm font-semibold text-slate-750">
                            {member.field || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100/80 text-slate-500 rounded-lg shrink-0 mt-0.5">
                          <UserCheck className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            Төлөөлөх хүн / Албан тушаал
                          </div>
                          <div className="text-sm font-semibold text-slate-750">
                            {member.director || "—"}
                            {member.position ? ` (${member.position})` : ""}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Col 2: Contacts & Address */}
                    <div className="flex flex-col gap-4">
                      <div className="border-b border-slate-100 pb-1.5">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Холбоо барих & Хаяг
                        </h4>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100/80 text-slate-500 rounded-lg shrink-0 mt-0.5">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            Утасны дугаар
                          </div>
                          <div className="text-sm font-semibold text-slate-750">
                            {member.phone || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100/80 text-slate-500 rounded-lg shrink-0 mt-0.5">
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            Цахим шуудан (И-мэйл)
                          </div>
                          <div className="text-sm font-semibold text-slate-750 truncate max-w-[220px]">
                            {member.email || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100/80 text-slate-500 rounded-lg shrink-0 mt-0.5">
                          <Globe className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            Вэбсайт хаяг
                          </div>
                          <div className="text-sm font-semibold text-slate-750">
                            {member.website || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100/80 text-slate-500 rounded-lg shrink-0 mt-0.5">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            Албан ёсны хаяг байршил
                          </div>
                          <div className="text-sm font-semibold text-slate-750 leading-snug">
                            {member.address || "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex gap-2.5 mt-2">
                {sub.status === "SIGNED" && (
                  <>
                    <a
                      href={
                        sub.pdfUrl || `${WEB}/contract/sign/${sub.id}?print=1`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      download={
                        sub.pdfUrl
                          ? `${sub.contractName || sub.org}_гэрээ${sub.pdfUrl.endsWith(".pdf") ? ".pdf" : ".png"}`
                          : undefined
                      }
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#1e4e8c] text-white rounded-xl text-sm font-semibold hover:bg-[#163d70] transition-all shadow-sm hover:shadow active:scale-[0.98] text-center"
                    >
                      <Download className="w-4 h-4" /> PDF татах
                    </a>
                    {!sub.pdfUrl && (
                      <a
                        href={`${WEB}/contract/sign/${sub.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-5 py-3 border border-slate-200 text-slate-600 bg-white rounded-xl text-sm font-semibold hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm active:scale-[0.98]"
                      >
                        Линк нээх <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Original Document PDF/HTML Viewer */
            <div className="h-full flex flex-col gap-4">
              <div className="flex items-center justify-between bg-white border border-slate-100 rounded-xl px-4 py-2.5 shadow-sm">
                <span className="text-xs font-semibold text-slate-500">
                  Цахим гэрээний эх хувь
                </span>
                <div className="flex items-center gap-2">
                  {!sub.pdfUrl && (
                    <button
                      onClick={() => {
                        const iframe = document.getElementById(
                          "contract-iframe",
                        ) as HTMLIFrameElement;
                        if (iframe) iframe.contentWindow?.print();
                      }}
                      className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800"
                      title="Хэвлэх"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  )}
                  <a
                    href={
                      sub.pdfUrl || `${WEB}/contract/sign/${sub.id}?print=1`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800"
                    title="Шинэ цонхонд томруулах"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Sandbox PDF frame wrapper */}
              <div className="flex-1 min-h-[550px] relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-200 p-4 flex justify-center">
                <iframe
                  id="contract-iframe"
                  src={sub.pdfUrl || `${WEB}/contract/sign/${sub.id}?print=1`}
                  className="w-full h-full max-w-[800px] border border-slate-300 rounded-xl bg-white shadow-lg overflow-y-auto"
                  title="Гэрээний эх хувь"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
