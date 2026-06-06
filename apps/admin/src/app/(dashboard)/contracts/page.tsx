"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Search, Filter, Download, RefreshCw, FileText,
  CheckCircle2, Clock, ChevronUp, ChevronDown, X,
  Building, Phone, Mail, Calendar, AlertTriangle, Layers,
  FileCheck, XCircle, Files, Printer, ExternalLink,
  ChevronLeft, ChevronRight, Maximize2, Hash, Package,
  Building2, ShieldCheck, Briefcase, MapPin, Globe,
  UserCheck, PenTool, ShieldAlert, Upload
} from "lucide-react";
import { adminFetch } from "@/lib/api";
import { Contract } from "@/components/organisms/sections/contract/page";
import {
  ContractArchiveFilters,
  ContractArchiveHeader,
  ContractStatusCards,
} from "@/components/organisms/contracts/ContractArchiveShell";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";
const API = `${API_BASE}/api`;
const WEB = process.env.NEXT_PUBLIC_WEB_URL || (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:3000" : "https://mglstore.mn");

type Submission = {
  id: string;
  templateId: string;
  org: string;
  register: string | null;
  phone: string | null;
  email: string | null;
  status: "SIGNED" | "PENDING";
  isPaid: boolean;
  feePlan: string | null;
  feePlanLabel: string;
  signedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  memberData: any;
  headerData: any;
  pdfUrl: string | null;
  contractNumber: string | null;
  contractName: string | null;
};

type SortKey = "org" | "status" | "signedAt" | "expiresAt" | "createdAt";

function getContractDisplayName(sub: Submission) {
  return sub.contractName || sub.headerData?.contractTitle || sub.headerData?.title || "Нэргүй гэрээ";
}

function getContractCode(sub: Submission) {
  return sub.contractNumber || `MGL-${sub.id.slice(0, 8).toUpperCase()}`;
}

function ContractNameCell({ sub }: { sub: Submission }) {
  return (
    <div className="min-w-[260px] max-w-[360px]">
      <div className="mb-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">
        <FileText className="h-3 w-3 shrink-0" />
        <span className="truncate">{getContractCode(sub)}</span>
      </div>
      <div className="line-clamp-2 text-[15px] font-black leading-snug text-slate-950 transition-colors group-hover:text-blue-700">
        {getContractDisplayName(sub)}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
        <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="truncate">{sub.org}</span>
      </div>
    </div>
  );
}

function statusDays(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return <span className="text-slate-400 text-xs">—</span>;
  const days = statusDays(expiresAt);
  if (days === null) return <span className="text-slate-400 text-xs">—</span>;
  const date = new Date(expiresAt).toLocaleDateString("mn-MN");

  if (days < 0) {
    return (
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-rose-600">{date}</span>
        <span className="text-[10px] font-medium text-rose-500 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 w-max mt-0.5">Хугацаа дууссан</span>
      </div>
    );
  }
  if (days <= 30) {
    return (
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-amber-600">{date}</span>
        <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 w-max mt-0.5">{days} өдөр үлдсэн</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-700 font-medium">{date}</span>
      <span className="text-[10px] text-slate-400 mt-0.5">{days} өдөр үлдсэн</span>
    </div>
  );
}

function DetailPanel({ sub, onClose }: { sub: Submission; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"info" | "original">("info");
  const member = sub.memberData as any;
  const days = statusDays(sub.expiresAt);
  const expiring = days !== null && days >= 0 && days <= 30;
  const expired = days !== null && days < 0;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm transition-all duration-300"
      onClick={e => e.target === e.currentTarget && onClose()}
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
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === "info"
              ? "border-b-[#1e4e8c] text-[#1e4e8c]"
              : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            Ерөнхий мэдээлэл
          </button>
          <button
            onClick={() => setActiveTab("original")}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${activeTab === "original"
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
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Гэрээний дугаар</div>
                    <div className="font-bold text-slate-800 text-sm font-mono mt-0.5">
                      {sub.contractNumber || `MGL-${sub.id.slice(0, 8).toUpperCase()}`}
                    </div>
                  </div>
                </div>

                {/* Card 2: Plan */}
                <div className="bg-white border-l-4 border-l-indigo-500 border border-slate-200/60 rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Гэрээний багц</div>
                    <div className="font-bold text-slate-850 text-sm mt-0.5 leading-tight truncate max-w-[150px]" title={sub.feePlanLabel || ""}>
                      {sub.feePlanLabel || <span className="text-slate-400 italic text-xs">Тохируулаагүй</span>}
                    </div>
                  </div>
                </div>

                {/* Card 3: Created date */}
                <div className="bg-white border-l-4 border-l-slate-450 border border-slate-200/60 rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <div className="p-2.5 bg-slate-100 text-slate-655 rounded-xl shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Үүсгэсэн огноо</div>
                    <div className="font-bold text-slate-800 text-sm mt-0.5">{new Date(sub.createdAt).toLocaleDateString("mn-MN")}</div>
                  </div>
                </div>

                {/* Card 4: Signed date */}
                <div className={`bg-white border-l-4 border border-slate-200/60 rounded-xl p-4 shadow-sm flex items-center gap-3 ${sub.signedAt ? "border-l-emerald-500" : "border-l-slate-300"}`}>
                  <div className={`p-2.5 rounded-xl shrink-0 ${sub.signedAt ? "bg-emerald-50 text-emerald-650" : "bg-slate-50 text-slate-400"}`}>
                    <PenTool className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Гарын үсэг зурсан</div>
                    <div className="font-bold text-slate-800 text-sm mt-0.5">
                      {sub.signedAt ? new Date(sub.signedAt).toLocaleDateString("mn-MN") : <span className="text-slate-400 italic text-xs">Зураагүй</span>}
                    </div>
                  </div>
                </div>

                {/* Card 5: Expiry date */}
                <div className={`bg-white border-l-4 border border-slate-200/60 rounded-xl p-4 shadow-sm flex items-center gap-3 ${expired ? "border-l-rose-500" : expiring ? "border-l-amber-500" : "border-l-blue-500"}`}>
                  <div className={`p-2.5 rounded-xl shrink-0 ${expired ? "bg-rose-50 text-rose-650" : expiring ? "bg-amber-50 text-amber-650" : "bg-blue-50 text-blue-600"}`}>
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Дуусах огноо</div>
                    <div className="font-bold text-slate-800 text-sm mt-0.5">
                      {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString("mn-MN") : <span className="text-slate-400 italic text-xs">Тохируулаагүй</span>}
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
                      <span className="font-bold text-slate-700 text-sm">Байгууллагын албан ёсны мэдээлэл</span>
                    </div>
                    <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2.5 py-0.5 rounded-full uppercase">Идэвхтэй</span>
                  </div>

                  {/* Form Field Layout */}
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Col 1: General Company info */}
                    <div className="flex flex-col gap-4">
                      <div className="border-b border-slate-100 pb-1.5">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ерөнхий бүртгэл</h4>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100/80 text-slate-500 rounded-lg shrink-0 mt-0.5">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Байгууллагын нэр</div>
                          <div className="text-sm font-semibold text-slate-750">{member.name || "—"}</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100/80 text-slate-500 rounded-lg shrink-0 mt-0.5">
                          <Hash className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Улсын бүртгэлийн регистр</div>
                          <div className="text-sm font-semibold text-slate-750">{member.register || "—"}</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100/80 text-slate-500 rounded-lg shrink-0 mt-0.5">
                          <Briefcase className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Үйл ажиллагааны чиглэл</div>
                          <div className="text-sm font-semibold text-slate-750">{member.field || "—"}</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100/80 text-slate-500 rounded-lg shrink-0 mt-0.5">
                          <UserCheck className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Төлөөлөх хүн / Албан тушаал</div>
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
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Холбоо барих & Хаяг</h4>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100/80 text-slate-500 rounded-lg shrink-0 mt-0.5">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Утасны дугаар</div>
                          <div className="text-sm font-semibold text-slate-750">{member.phone || "—"}</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100/80 text-slate-500 rounded-lg shrink-0 mt-0.5">
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Цахим шуудан (И-мэйл)</div>
                          <div className="text-sm font-semibold text-slate-750 truncate max-w-[220px]">{member.email || "—"}</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100/80 text-slate-500 rounded-lg shrink-0 mt-0.5">
                          <Globe className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Вэбсайт хаяг</div>
                          <div className="text-sm font-semibold text-slate-750">{member.website || "—"}</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100/80 text-slate-500 rounded-lg shrink-0 mt-0.5">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Албан ёсны хаяг байршил</div>
                          <div className="text-sm font-semibold text-slate-750 leading-snug">{member.address || "—"}</div>
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
                      href={sub.pdfUrl || `${WEB}/contract/sign/${sub.id}?print=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={sub.pdfUrl ? `${sub.contractName || sub.org}_гэрээ${sub.pdfUrl.endsWith('.pdf') ? '.pdf' : '.png'}` : undefined}
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
                <span className="text-xs font-semibold text-slate-500">Цахим гэрээний эх хувь</span>
                <div className="flex items-center gap-2">
                  {!sub.pdfUrl && (
                    <button
                      onClick={() => {
                        const iframe = document.getElementById("contract-iframe") as HTMLIFrameElement;
                        if (iframe) iframe.contentWindow?.print();
                      }}
                      className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800"
                      title="Хэвлэх"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  )}
                  <a
                    href={sub.pdfUrl || `${WEB}/contract/sign/${sub.id}?print=1`}
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

function RegisterScannedModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
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
  const [signedAt, setSignedAt] = useState(new Date().toISOString().split("T")[0]);
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const feePlans = useMemo(() => {
    if (!selectedTemplateId) return [];
    const t = templates.find(temp => temp.id === selectedTemplateId);
    if (!t) return [];
    return t.headerData?.feePlans || [];
  }, [selectedTemplateId, templates]);

  useEffect(() => {
    adminFetch(`${API}/contracts`)
      .then(r => r.json())
      .then(d => {
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
    <div className="fixed inset-0 bg-slate-950/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#1e4e8c] text-white">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Upload className="w-5 h-5" /> Скандсан гэрээ бүртгэх
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Байгууллагын нэр <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={org}
              onChange={e => setOrg(e.target.value)}
              placeholder="Жишээ: Юнител ХХК"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Гэрээний нэр</label>
              <input
                type="text"
                value={contractName}
                onChange={e => setContractName(e.target.value)}
                placeholder="Жишээ: Хамтын ажиллагааны гэрээ"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Гэрээний дугаар</label>
              <input
                type="text"
                value={contractNumber}
                onChange={e => setContractNumber(e.target.value)}
                placeholder="Жишээ: CNT-2026-001"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Регистрийн дугаар</label>
              <input
                type="text"
                value={register}
                onChange={e => setRegister(e.target.value)}
                placeholder="8 оронтой тоо"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Гүйцэтгэх захирал</label>
              <input
                type="text"
                value={director}
                onChange={e => setDirector(e.target.value)}
                placeholder="Захирлын нэр"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Албан тушаал</label>
              <input
                type="text"
                value={position}
                onChange={e => setPosition(e.target.value)}
                placeholder="Жишээ: Захирал"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Утас</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Утасны дугаар"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">И-мэйл</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Шуудангийн хаяг"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Хийгдсэн огноо</label>
              <input
                type="date"
                value={signedAt}
                onChange={e => setSignedAt(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50 text-slate-600 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Дуусах огноо</label>
              <input
                type="date"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50 text-slate-600 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Гэрээний загвар</label>
              <div className="relative">
                <select
                  value={selectedTemplateId}
                  onChange={e => {
                    setSelectedTemplateId(e.target.value);
                    setFeePlan("");
                  }}
                  className="w-full py-2.5 pl-3 pr-8 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50 text-slate-650 font-medium appearance-none cursor-pointer"
                >
                  <option value="">Сонгохгүй (Бие даасан)</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.org} - MGL-{t.id.slice(0,6).toUpperCase()}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Багц сонгох</label>
              <div className="relative">
                <select
                  value={feePlan}
                  onChange={e => setFeePlan(e.target.value)}
                  disabled={!selectedTemplateId}
                  className="w-full py-2.5 pl-3 pr-8 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 bg-slate-50/50 text-slate-650 font-medium appearance-none cursor-pointer disabled:opacity-50"
                >
                  <option value="">Багц байхгүй</option>
                  {feePlans.map((p: any) => (
                    <option key={p.key} value={p.key}>{p.label} - {Number(p.price || 0).toLocaleString()}₮</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Сканнердсан файл <span className="text-rose-500">*</span></label>
            <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/30 flex flex-col items-center justify-center gap-2 relative">
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                required
              />
              <Upload className="w-8 h-8 text-slate-400" />
              {file ? (
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-slate-700 max-w-[300px] truncate">{file.name}</span>
                  <span className="text-xs text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-bold text-slate-600">Файл оруулах бол энд дарна уу</span>
                  <span className="text-xs text-slate-400">PDF, JPG, PNG эсвэл WebP (макс 15MB)</span>
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

function SubmissionsList() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SIGNED" | "PENDING" | "EXPIRING" | "EXPIRED">("ALL");
  const [planFilter, setPlanFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Submission | null>(null);
  const [openRegisterScanned, setOpenRegisterScanned] = useState(false);


  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Fetch contract history
  const load = () => {
    setLoading(true);
    adminFetch(`${API}/contracts/submissions/all`)
      .then(r => r.json())
      .then(d => { if (d.success) setSubmissions(d.submissions); })
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Unique plans list for filter dropdown
  const plansList = useMemo(() => {
    const plans = new Set<string>();
    submissions.forEach(s => {
      if (s.feePlanLabel) plans.add(s.feePlanLabel);
    });
    return Array.from(plans);
  }, [submissions]);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, planFilter, itemsPerPage]);

  const filtered = useMemo(() => {
    let list = submissions;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.org.toLowerCase().includes(q) ||
        (s.register ?? "").toLowerCase().includes(q) ||
        (s.phone ?? "").includes(q) ||
        (s.email ?? "").toLowerCase().includes(q)
      );
    }

    if (statusFilter === "SIGNED") list = list.filter(s => s.status === "SIGNED");
    else if (statusFilter === "PENDING") list = list.filter(s => s.status === "PENDING");
    else if (statusFilter === "EXPIRING") list = list.filter(s => {
      const d = statusDays(s.expiresAt);
      return d !== null && d >= 0 && d <= 30;
    });
    else if (statusFilter === "EXPIRED") list = list.filter(s => {
      const d = statusDays(s.expiresAt);
      return d !== null && d < 0;
    });

    if (planFilter !== "ALL") {
      list = list.filter(s => s.feePlanLabel === planFilter);
    }

    list = [...list].sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === "org") { av = a.org; bv = b.org; }
      else if (sortKey === "status") { av = a.status; bv = b.status; }
      else if (sortKey === "signedAt") { av = a.signedAt ? new Date(a.signedAt).getTime() : 0; bv = b.signedAt ? new Date(b.signedAt).getTime() : 0; }
      else if (sortKey === "expiresAt") { av = a.expiresAt ? new Date(a.expiresAt).getTime() : 0; bv = b.expiresAt ? new Date(b.expiresAt).getTime() : 0; }
      else { av = new Date(a.createdAt).getTime(); bv = new Date(b.createdAt).getTime(); }

      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [submissions, search, statusFilter, planFilter, sortKey, sortDir]);

  // Paginated calculations
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageIndex = Math.min(currentPage, totalPages);
  const paginatedList = useMemo(() => {
    const start = (pageIndex - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, pageIndex, itemsPerPage]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
      : <ChevronDown className="w-3.5 h-3.5 text-slate-300" />;

  const stats = useMemo(() => ({
    total: submissions.length,
    signed: submissions.filter(s => s.status === "SIGNED").length,
    pending: submissions.filter(s => s.status === "PENDING").length,
    expiring: submissions.filter(s => { const d = statusDays(s.expiresAt); return d !== null && d >= 0 && d <= 30; }).length,
    expired: submissions.filter(s => { const d = statusDays(s.expiresAt); return d !== null && d < 0; }).length,
  }), [submissions]);

  const FILTERS: {
    key: typeof statusFilter;
    label: string;
    count: number;
    tone: "slate" | "emerald" | "amber" | "orange" | "rose";
    icon: React.ElementType;
  }[] = [
    { key: "ALL", label: "Бүх гэрээ", count: stats.total, tone: "slate", icon: Files },
    { key: "SIGNED", label: "Баталгаажсан", count: stats.signed, tone: "emerald", icon: FileCheck },
    { key: "PENDING", label: "Хүлээгдэж буй", count: stats.pending, tone: "amber", icon: Clock },
    { key: "EXPIRING", label: "Дуусах дөхсөн", count: stats.expiring, tone: "orange", icon: AlertTriangle },
    { key: "EXPIRED", label: "Дууссан", count: stats.expired, tone: "rose", icon: XCircle },
  ];

  return (
    <div className="flex flex-col gap-6">
      {selected && <DetailPanel sub={selected} onClose={() => setSelected(null)} />}
      {openRegisterScanned && (
        <RegisterScannedModal
          onClose={() => setOpenRegisterScanned(false)}
          onSuccess={() => {
            load();
          }}
        />
      )}

      <ContractArchiveHeader
        total={stats.total}
        filtered={filtered.length}
        loading={loading}
        onRegister={() => setOpenRegisterScanned(true)}
        onRefresh={load}
      />

      <ContractStatusCards
        filters={FILTERS}
        active={statusFilter}
        total={stats.total}
        onSelect={setStatusFilter}
      />

      <ContractArchiveFilters
        search={search}
        planFilter={planFilter}
        plansList={plansList}
        filteredCount={filtered.length}
        onSearchChange={setSearch}
        onPlanFilterChange={setPlanFilter}
      />

      {/* Main Table View */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950">
              Архивын жагсаалт
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              Мөр дээр дарж гэрээний дэлгэрэнгүй мэдээлэл болон эх хувийг
              нээнэ.
            </p>
          </div>
          <span className="w-max rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
            {paginatedList.length}/{filtered.length} харагдаж байна
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50/70 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="min-w-[320px] px-6 py-4 font-semibold">
                  <button onClick={() => toggleSort("org")} className="flex items-center gap-1 font-bold hover:text-slate-800 transition-colors">
                    Гэрээний нэр / Байгууллага <SortIcon k="org" />
                  </button>
                </th>
                <th className="px-6 py-4 font-semibold">
                  <button onClick={() => toggleSort("status")} className="flex items-center gap-1 font-bold hover:text-slate-800 transition-colors">
                    Гэрээний төлөв <SortIcon k="status" />
                  </button>
                </th>
                <th className="px-6 py-4 font-bold">Сонгосон багц</th>
                <th className="px-6 py-4 font-semibold">
                  <button onClick={() => toggleSort("signedAt")} className="flex items-center gap-1 font-bold hover:text-slate-800 transition-colors">
                    Гарын үсэг зурсан <SortIcon k="signedAt" />
                  </button>
                </th>
                <th className="px-6 py-4 font-semibold">
                  <button onClick={() => toggleSort("expiresAt")} className="flex items-center gap-1 font-bold hover:text-slate-800 transition-colors">
                    Дуусах хугацаа <SortIcon k="expiresAt" />
                  </button>
                </th>
                <th className="px-6 py-4 font-bold">Холбоо барих мэдээлэл</th>
                <th className="px-6 py-4 font-bold text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                      <span className="text-xs font-semibold text-slate-400">Гэрээнүүдийг ачаалж байна...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="w-12 h-12 text-slate-200" />
                      <span className="font-bold text-slate-500">Архивт тохирох гэрээ олдсонгүй</span>
                      <p className="text-xs text-slate-400 max-w-sm mt-1">Хайлтын үг, төлөв эсвэл багцын шүүлтүүрээ өөрчлөөд дахин шалгана уу.</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedList.map(s => {
                const days = statusDays(s.expiresAt);
                const rowAlert = days !== null && days < 0 ? "bg-rose-50/20 hover:bg-rose-50/40" : days !== null && days <= 30 ? "bg-amber-50/20 hover:bg-amber-50/40" : "hover:bg-slate-50/50";
                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelected(s)}
                    className={`group cursor-pointer transition-colors border-b border-slate-100 last:border-b-0 ${rowAlert}`}
                  >
                    <td className="px-6 py-5 align-top">
                      <ContractNameCell sub={s} />
                    </td>
                    <td className="px-6 py-4.5">
                      {s.status === "SIGNED" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Баталгаажсан
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-xs font-bold">
                          <Clock className="w-3.5 h-3.5" /> Хүлээгдэж буй
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4.5 font-semibold text-slate-700 text-xs">
                      {s.feePlanLabel}
                    </td>
                    <td className="px-6 py-4.5">
                      {s.signedAt ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(s.signedAt).toLocaleDateString("mn-MN")}
                        </div>
                      ) : (
                        <span className="text-slate-300 font-medium">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4.5">
                      <ExpiryBadge expiresAt={s.expiresAt} />
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="flex flex-col gap-1 text-xs text-slate-500 font-semibold">
                        {s.phone && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400" /> {s.phone}
                          </span>
                        )}
                        {s.email && (
                          <span className="flex items-center gap-1.5 truncate max-w-[180px]">
                            <Mail className="w-3 h-3 text-slate-400" /> {s.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4.5 text-right">
                      {s.status === "SIGNED" && (
                        <a
                          href={s.pdfUrl || `${WEB}/contract/sign/${s.id}?print=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={s.pdfUrl ? `${s.contractName || s.org}_гэрээ${s.pdfUrl.endsWith('.pdf') ? '.pdf' : '.png'}` : undefined}
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1e4e8c] hover:bg-[#163d70] text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Premium Pagination Control Footer */}
        {filtered.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-150 px-6 py-4 flex items-center justify-between flex-wrap gap-4">

            {/* Page statistics */}
            <div className="text-xs font-semibold text-slate-500">
              Нийт {filtered.length} гэрээнээс {Math.min(filtered.length, (pageIndex - 1) * itemsPerPage + 1)} - {Math.min(filtered.length, pageIndex * itemsPerPage)} дахь гэрээ харагдаж байна
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-4">

              {/* Items per page Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Харагдах тоо:</span>
                <select
                  value={itemsPerPage}
                  onChange={e => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="py-1 px-2 border border-slate-200 bg-white rounded-lg text-xs font-bold text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {[10, 15, 25, 50, 100].map(val => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </div>

              {/* Prev/Next buttons */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={pageIndex === 1}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs font-bold text-slate-700 px-3">
                  хуудас {pageIndex} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={pageIndex === totalPages}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ContractsPage() {
  const [activeTab, setActiveTab] = useState<"submissions" | "templates">("submissions");

  return (
    <div className="flex flex-col gap-5 p-1 sm:p-2">
      <div className="sticky top-3 z-30 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 px-2">
            <FileText className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              Гэрээний сан
            </span>
          </div>
          <div className="grid gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 sm:flex sm:w-max">
          <button
            onClick={() => setActiveTab("submissions")}
            className={`flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-black transition-all ${activeTab === "submissions"
              ? "bg-white text-[#1e4e8c] shadow-sm ring-1 ring-slate-200"
              : "text-slate-500 hover:bg-white hover:text-slate-800"
              }`}
          >
            <FileText className="w-3.5 h-3.5" /> Байгуулсан гэрээнүүд
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className={`flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-black transition-all ${activeTab === "templates"
              ? "bg-white text-[#1e4e8c] shadow-sm ring-1 ring-slate-200"
              : "text-slate-500 hover:bg-white hover:text-slate-800"
              }`}
          >
            <Layers className="w-3.5 h-3.5" /> Гэрээний загвар тохиргоо
          </button>
          </div>
        </div>
      </div>

      {activeTab === "submissions" && <SubmissionsList />}
      {activeTab === "templates" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 shadow-sm flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white p-2 text-[#1e4e8c] shadow-sm">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800">Хийх боломжтой гэрээнүүдийн сан</h2>
                <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-slate-500">
                  Энд хадгалсан бүх гэрээ хэрэглэгчийн `/contract` хуудсанд харагдана. Хэрэглэгч гэрээ сонгоод зөвхөн бүртгэлээр нэвтэрсний дараа бөглөж баталгаажуулах боломжтой.
                </p>
              </div>
            </div>
            <a
              href={`${WEB}/contract`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1e4e8c] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#163d70]"
            >
              Хэрэглэгчийн гэрээний сан нээх <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <Contract />
          </div>
        </div>
      )}
    </div>
  );
}
