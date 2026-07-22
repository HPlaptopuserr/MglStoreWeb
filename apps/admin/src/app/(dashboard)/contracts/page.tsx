"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  FileText,
  CheckCircle2,
  Clock,
  ChevronUp,
  ChevronDown,
  X,
  Building,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  Layers,
  FileCheck,
  XCircle,
  Files,
  Printer,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Hash,
  Package,
  Building2,
  ShieldCheck,
  Briefcase,
  MapPin,
  Globe,
  UserCheck,
  PenTool,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { adminFetch } from "@/lib/api";
import { Contract } from "@/components/organisms/sections/contract/page";
import {
  ContractArchiveFilters,
  ContractArchiveHeader,
  ContractStatusCards,
} from "@/components/organisms/contracts/ContractArchiveShell";

import { WEB } from "./contracts.config";

import {
  ContractNameCell,
  ExpiryBadge,
  getContractCode,
  getContractDisplayName,
  statusDays,
  type SortKey,
  type Submission,
} from "./contracts.model";
import { ContractSubmissionsList } from "./ContractSubmissionsList";
export default function ContractsPage() {
  const [activeTab, setActiveTab] = useState<"submissions" | "templates">(
    "submissions",
  );

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
              className={`flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-black transition-all ${
                activeTab === "submissions"
                  ? "bg-white text-[#1e4e8c] shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:bg-white hover:text-slate-800"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Байгуулсан гэрээнүүд
            </button>
            <button
              onClick={() => setActiveTab("templates")}
              className={`flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-black transition-all ${
                activeTab === "templates"
                  ? "bg-white text-[#1e4e8c] shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:bg-white hover:text-slate-800"
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Гэрээний загвар тохиргоо
            </button>
          </div>
        </div>
      </div>

      {activeTab === "submissions" && <ContractSubmissionsList />}
      {activeTab === "templates" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 shadow-sm flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white p-2 text-[#1e4e8c] shadow-sm">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800">
                  Хийх боломжтой гэрээнүүдийн сан
                </h2>
                <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-slate-500">
                  Энд хадгалсан бүх гэрээ хэрэглэгчийн `/contract` хуудсанд
                  харагдана. Хэрэглэгч гэрээ сонгоод зөвхөн бүртгэлээр
                  нэвтэрсний дараа бөглөж баталгаажуулах боломжтой.
                </p>
              </div>
            </div>
            <a
              href={`${WEB}/contract`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1e4e8c] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#163d70]"
            >
              Хэрэглэгчийн гэрээний сан нээх{" "}
              <ExternalLink className="w-3.5 h-3.5" />
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
