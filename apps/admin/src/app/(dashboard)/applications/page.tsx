"use client";

import { AdminButton } from "@/components/atoms";
import { Plus } from "lucide-react";
import { AddJobPositionForm } from "@/components/organisms/AddJobPositionForm";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Search,
  Briefcase,
  Filter,
  Phone,
  Calendar,
  Check,
  X,
  Loader2,
  User,
  MapPin,
  GraduationCap,
  Clock,
  Star,
  Heart,
  Languages,
  Banknote,
  FileText,
  Users,
  Eye,
  ArrowUpRight,
  Pencil,
} from "lucide-react";
import { API_BASE, adminFetch } from "@/lib/api";

interface JobApplication {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  registerNumber: string | null;
  age: number | null;
  gender: string | null;
  address: string | null;
  jobPosition: { id: string; name: string; slug: string; isActive: boolean; createdAt: string } | null;
  education: string | null;
  salaryExpect: string | null;
  experience: string | null;
  professionalSkills: string | null;
  personalSkills: string | null;
  languages: string | null;
  status: string;
  createdAt: string;
}

interface JobPosition {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
}

const EDUCATION_LABELS: Record<string, string> = {
  incomplete_secondary: "Бүрэн бус дунд",
  high_school: "Бүрэн дунд",
  vocational: "МСҮТ / Коллеж",
  student: "Оюутан",
  bachelor: "Бакалавр",
  master: "Магистр",
  doctor: "Доктор",
};

const GENDER_LABELS: Record<string, string> = {
  MALE: "Эрэгтэй",
  FEMALE: "Эмэгтэй",
};

function getStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Хүлээгдэж буй";
    case "APPROVED":
      return "Зөвшөөрсөн";
    case "REJECTED":
      return "Татгалзсан";
    default:
      return status;
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "PENDING":
      return " bg-[#5B4CFF] text-amber-700 border border-amber-200";
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "REJECTED":
      return "bg-rose-50 text-rose-700 border border-rose-200";
    default:
      return "bg-slate-50 text-slate-600 border border-slate-200";
  }
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-slate-400" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-sm font-medium text-slate-800 wrap-break-word">
        {value || "—"}
      </p>
    </div>
  );
}

export default function ApplicationsPage() {
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [creatingJob, setCreatingJob] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editingJobName, setEditingJobName] = useState("");
  const [editingJobActive, setEditingJobActive] = useState(true);
  const [savingJob, setSavingJob] = useState(false);
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchJobPositions = useCallback(async () => {
    try {
      setLoadingJobs(true);
      const res = await adminFetch(`${API_BASE}/api/job-positions`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Ажлын байр ачааллах боломжгүй");
      const data = await res.json();
      setJobPositions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setJobPositions([]);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  const fetchApps = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await adminFetch(
        `${API_BASE}/api/job-applications?${params.toString()}`,
        { cache: "no-store", headers: { "Content-Type": "application/json" } },
      );
      if (!res.ok) throw new Error(`Ачааллах боломжгүй (${res.status})`);

      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];
      setApps(list);
    } catch (err) {
      console.error(err);
      setApps([]);
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchApps();
    fetchJobPositions();
  }, [fetchApps, fetchJobPositions]);

  const handleAction = useCallback(
    async (id: string, action: "approve" | "reject") => {
      try {
        setActionId(id);
        setError("");
        const res = await adminFetch(
          `${API_BASE}/api/job-applications/${id}/${action}`,
          { method: "PATCH", headers: { "Content-Type": "application/json" } },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message || `Үйлдэл амжилтгүй (${res.status})`);
        }
        await fetchApps();
        if (selectedApp?.id === id) {
          setSelectedApp(null);
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Алдаа гарлаа");
      } finally {
        setActionId(null);
      }
    },
    [fetchApps, selectedApp],
  );

  const filtered = useMemo(() => {
    if (positionFilter === "ALL") return apps;
    return apps.filter((a) => a.jobPosition?.name === positionFilter);
  }, [apps, positionFilter]);

  const stats = useMemo(() => {
    const total = apps.length;
    const pending = apps.filter((a) => a.status === "PENDING").length;
    const approved = apps.filter((a) => a.status === "APPROVED").length;
    const rejected = apps.filter((a) => a.status === "REJECTED").length;
    const today = apps.filter(
      (a) => new Date(a.createdAt).toDateString() === new Date().toDateString(),
    ).length;
    return { total, pending, approved, rejected, today };
  }, [apps]);

  const positionStats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of apps) {
      const key = a.jobPosition?.name || "other";
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [apps]);

  const handleCreateJobPosition = async ({
    jobName,
  }: {
    jobName: string;
  }) => {
    try {
      setCreatingJob(true);
      setError("");

      const res = await adminFetch(`${API_BASE}/api/job-positions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: jobName,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Ажлын байр үүсгэхэд алдаа гарлаа");
      }
      
      await fetchJobPositions(); // Refresh job positions list
    } catch (err) {
      // Intentionally not logging to console.error to prevent Next.js from displaying crash overlay on logical user errors
      throw err;
    } finally {
      setCreatingJob(false);
    }
  };

  const handleEditJobPosition = async (id: string, name: string, isActive: boolean) => {
    try {
      setSavingJob(true);
      setError("");

      if (!name.trim()) return;

      const res = await adminFetch(`${API_BASE}/api/job-positions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          isActive,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Ажлын байр шинэчлэхэд алдаа гарлаа");
      }
      
      setEditingJobId(null);
      await fetchJobPositions(); // Refresh job positions list
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
      alert(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setSavingJob(false);
    }
  };

  const handleDeleteJobPosition = async (id: string) => {
    if (!confirm("Та энэ ажлын байрыг устгахдаа итгэлтэй байна уу?")) return;
    
    try {
      setError("");
      
      const res = await adminFetch(`${API_BASE}/api/job-positions/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Ажлын байр устгахад алдаа гарлаа");
      }
      
      await fetchJobPositions(); // Refresh job positions list
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
      alert(err instanceof Error ? err.message : "Алдаа гарлаа");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-4 font-sans text-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 shrink-0">
            <Briefcase size={22} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">
              Ажлын анкетууд
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
              Нийт{" "}
              <span className="font-bold text-slate-600">{stats.total}</span>{" "}
              анкет бүртгэгдсэн
            </p>
          </div>
        </div>
        <AddJobPositionForm
          loading={creatingJob}
          onSubmit={handleCreateJobPosition}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {[
          {
            label: "Нийт анкет",
            value: stats.total,
            icon: FileText,
            bg: "bg-indigo-50",
            color: "text-indigo-600",
            ring: "ring-indigo-500/10",
          },
          {
            label: "Хүлээгдэж буй",
            value: stats.pending,
            icon: Clock,
            bg: "bg-amber-50",
            color: "text-amber-600",
            ring: "ring-amber-500/10",
          },
          {
            label: "Зөвшөөрсөн",
            value: stats.approved,
            icon: Check,
            bg: "bg-emerald-50",
            color: "text-emerald-600",
            ring: "ring-emerald-500/10",
          },
          {
            label: "Татгалзсан",
            value: stats.rejected,
            icon: X,
            bg: "bg-rose-50",
            color: "text-rose-600",
            ring: "ring-rose-500/10",
          },
          {
            label: "Өнөөдөр ирсэн",
            value: stats.today,
            icon: ArrowUpRight,
            bg: "bg-violet-50",
            color: "text-violet-600",
            ring: "ring-violet-500/10",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all ring-1 ${s.ring}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-8 h-8 rounded-lg ${s.bg} ${s.color} flex items-center justify-center`}
              >
                <s.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-none">
              {s.value}
            </p>
            <p className="text-[10px] sm:text-xs font-medium text-slate-400 mt-1">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-violet-500" />
          Зарлагдсан ажлын байрнууд
        </h2>
        
        {loadingJobs ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
            <Loader2 size={16} className="animate-spin text-violet-400" />
            Уншиж байна...
          </div>
        ) : jobPositions.length === 0 ? (
          <p className="text-sm text-slate-500 py-2">Ажлын байр бүртгэгдээгүй байна.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {jobPositions.map((job) => (
              <div 
                key={job.id} 
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors group relative overflow-hidden ${
                  editingJobId === job.id 
                    ? "border-violet-300 bg-white" 
                    : "border-slate-200 bg-slate-50 hover:border-violet-200 hover:bg-violet-50/50"
                }`}
              >
                {editingJobId === job.id ? (
                  <div className="flex items-center gap-2 pr-1">
                    <button 
                      onClick={() => setEditingJobActive(!editingJobActive)}
                      className={`w-3 h-3 rounded-full flex-shrink-0 transition-colors cursor-pointer ${editingJobActive ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-300 hover:bg-slate-400'}`} 
                      title={editingJobActive ? "Идэвхтэй байна (дарж идэвхгүй болгох)" : "Идэвхгүй байна (дарж идэвхтэй болгох)"}
                    />
                    <input 
                      autoFocus
                      type="text"
                      className="w-32 bg-transparent text-sm font-semibold text-slate-800 outline-none border-b border-violet-200 focus:border-violet-500 h-6"
                      value={editingJobName}
                      onChange={(e) => setEditingJobName(e.target.value)}
                      onKeyDown={(e) => {
                         if (e.key === 'Enter') handleEditJobPosition(job.id, editingJobName, editingJobActive);
                         if (e.key === 'Escape') setEditingJobId(null);
                      }}
                      disabled={savingJob}
                    />
                    <div className="flex items-center gap-1">
                      <button 
                        disabled={savingJob}
                        onClick={() => handleEditJobPosition(job.id, editingJobName, editingJobActive)}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                      >
                        {savingJob ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      </button>
                      <button 
                        disabled={savingJob}
                        onClick={() => setEditingJobId(null)}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${job.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className={`font-semibold ${job.isActive ? 'text-slate-700' : 'text-slate-500'}`}>{job.name}</span>
                    
                    <div className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-white via-white to-transparent pr-1 pl-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                      <button 
                        onClick={() => {
                          setEditingJobId(job.id);
                          setEditingJobName(job.name);
                          setEditingJobActive(job.isActive);
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors shadow-sm"
                        title="Засах"
                      >
                        <Pencil size={11} />
                      </button>
                      <button 
                        onClick={() => handleDeleteJobPosition(job.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors shadow-sm"
                        title="Устгах"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Нэр, утас хайх..."
              className="w-full sm:w-64 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
            <Filter size={15} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent outline-none"
            >
              <option value="ALL">Бүх төлөв</option>
              <option value="PENDING">Хүлээгдэж буй</option>
              <option value="APPROVED">Зөвшөөрсөн</option>
              <option value="REJECTED">Татгалзсан</option>
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
            <Briefcase size={15} className="text-slate-400" />
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="bg-transparent outline-none"
            >
              <option value="ALL">Бүх албан тушаал</option>
              {Object.entries(positionStats).map(([key, count]) => (
                <option key={key} value={key}>
                  {key === "other" ? "—" : key} {count ? `(${count})` : ""}
                </option>
              ))}
            </select>
          </div>

          {(searchTerm ||
            statusFilter !== "ALL" ||
            positionFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
                setPositionFilter("ALL");
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <X size={14} />
              Цэвэрлэх
            </button>
          )}
        </div>
      </div>

      {Object.keys(positionStats).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(positionStats).map(([key, count]) => (
            <button
              key={key}
              onClick={() =>
                setPositionFilter(positionFilter === key ? "ALL" : key)
              }
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                positionFilter === key
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {key === "other" ? "—" : key}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  positionFilter === key
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="hidden md:block w-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-225 border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Нэр</th>
                <th className="px-4 py-3">Утас</th>
                <th className="px-4 py-3">Албан тушаал</th>
                <th className="px-4 py-3">Боловсрол</th>
                <th className="px-4 py-3">Огноо</th>
                <th className="px-4 py-3">Төлөв</th>
                <th className="px-4 py-3 text-right">Үйлдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-16 text-center text-sm text-slate-400"
                  >
                    <div className="inline-flex items-center gap-2">
                      <Loader2
                        size={18}
                        className="animate-spin text-violet-400"
                      />
                      Ачааллаж байна...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                        <Briefcase size={20} className="text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-500">
                        Анкет олдсонгүй
                      </p>
                      <p className="text-xs text-slate-400">
                        Хайлтын нөхцөл өөрчлөх эсвэл шүүлтүүрийг цэвэрлэнэ үү
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isPending = item.status === "PENDING";
                  const isRowLoading = actionId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="group transition-colors hover:bg-slate-50/80 cursor-pointer"
                      onClick={() => setSelectedApp(item)}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                            <User size={17} />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">
                              {item.lastName} {item.firstName}
                            </div>
                            {item.address && (
                              <div className="mt-0.5 truncate text-xs text-slate-400 flex items-center gap-1">
                                <MapPin size={10} />
                                {item.address}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone size={14} className="text-slate-400" />
                          {item.phone || "—"}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">
                          <Briefcase size={12} />
                          {item.jobPosition?.name || "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <GraduationCap size={14} className="text-slate-400" />
                          {item.education
                            ? EDUCATION_LABELS[item.education] || item.education
                            : "—"}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Calendar size={14} className="text-slate-400" />
                          {new Date(item.createdAt).toLocaleDateString("mn-MN")}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(item.status)}`}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => setSelectedApp(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            <Eye size={13} />
                          </button>

                          {isPending && (
                            <>
                              <button
                                onClick={() => handleAction(item.id, "approve")}
                                disabled={isRowLoading}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                              >
                                {isRowLoading ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Check size={13} />
                                )}
                                <span className="hidden lg:inline">
                                  Зөвшөөрөх
                                </span>
                              </button>
                              <button
                                onClick={() => handleAction(item.id, "reject")}
                                disabled={isRowLoading}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-50"
                              >
                                {isRowLoading ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <X size={13} />
                                )}
                                <span className="hidden lg:inline">
                                  Татгалзах
                                </span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between text-xs text-slate-400">
            <span>
              Нийт{" "}
              <span className="font-semibold text-slate-600">
                {filtered.length}
              </span>{" "}
              анкет
            </span>
            <span>
              Хүлээгдэж буй:{" "}
              <span className="font-semibold text-amber-600">
                {filtered.filter((a) => a.status === "PENDING").length}
              </span>
            </span>
          </div>
        )}
      </div>

      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 size={20} className="animate-spin text-violet-400" />
            <span className="ml-2 text-sm">Ачааллаж байна...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <Briefcase size={20} className="text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500">
              Анкет олдсонгүй
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const isPending = item.status === "PENDING";
            const isRowLoading = actionId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full text-left p-4"
                  onClick={() => setSelectedApp(item)}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                        <User size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 text-sm truncate">
                          {item.lastName} {item.firstName}
                        </div>
                        {item.address && (
                          <div className="text-xs text-slate-400 truncate flex items-center gap-1">
                            <MapPin size={10} />
                            {item.address}
                          </div>
                        )}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${getStatusClass(item.status)}`}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Phone size={12} className="text-slate-400" />
                      {item.phone || "—"}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Briefcase size={12} className="text-slate-400" />
                      {item.jobPosition?.name || "—"}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <GraduationCap size={12} className="text-slate-400" />
                      {item.education
                        ? EDUCATION_LABELS[item.education] || item.education
                        : "—"}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-slate-400" />
                      {new Date(item.createdAt).toLocaleDateString("mn-MN")}
                    </div>
                  </div>
                </button>

                {isPending && (
                  <div className="flex border-t border-slate-100 divide-x divide-slate-100">
                    <button
                      onClick={() => handleAction(item.id, "approve")}
                      disabled={isRowLoading}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                    >
                      {isRowLoading ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Check size={13} />
                      )}
                      Зөвшөөрөх
                    </button>
                    <button
                      onClick={() => handleAction(item.id, "reject")}
                      disabled={isRowLoading}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                    >
                      {isRowLoading ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <X size={13} />
                      )}
                      Татгалзах
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {selectedApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setSelectedApp(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedApp.lastName} {selectedApp.firstName}
                  </h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold mt-0.5 ${getStatusClass(selectedApp.status)}`}
                  >
                    {getStatusLabel(selectedApp.status)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-5">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Хувийн мэдээлэл
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <DetailItem
                    icon={Phone}
                    label="Утас"
                    value={selectedApp.phone}
                  />
                  <DetailItem
                    icon={FileText}
                    label="Регистр"
                    value={selectedApp.registerNumber}
                  />
                  <DetailItem
                    icon={User}
                    label="Нас"
                    value={
                      selectedApp.age !== null ? `${selectedApp.age} нас` : null
                    }
                  />
                  <DetailItem
                    icon={User}
                    label="Хүйс"
                    value={
                      selectedApp.gender
                        ? GENDER_LABELS[selectedApp.gender] ||
                          selectedApp.gender
                        : null
                    }
                  />
                  <div className="col-span-2">
                    <DetailItem
                      icon={MapPin}
                      label="Хаяг"
                      value={selectedApp.address}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> Ажлын мэдээлэл
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <DetailItem
                    icon={Briefcase}
                    label="Албан тушаал"
                    value={selectedApp.jobPosition?.name}
                  />
                  <DetailItem
                    icon={GraduationCap}
                    label="Боловсрол"
                    value={
                      selectedApp.education
                        ? EDUCATION_LABELS[selectedApp.education] ||
                          selectedApp.education
                        : null
                    }
                  />
                  <DetailItem
                    icon={Banknote}
                    label="Цалингийн хүлээлт"
                    value={selectedApp.salaryExpect}
                  />
                  <DetailItem
                    icon={Calendar}
                    label="Огноо"
                    value={new Date(selectedApp.createdAt).toLocaleDateString(
                      "mn-MN",
                    )}
                  />
                  <div className="col-span-2">
                    <DetailItem
                      icon={Clock}
                      label="Туршлага"
                      value={selectedApp.experience}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5" /> Ур чадвар
                </h4>
                <div className="space-y-3">
                  <DetailItem
                    icon={Star}
                    label="Мэргэжлийн ур чадвар"
                    value={selectedApp.professionalSkills}
                  />
                  <DetailItem
                    icon={Heart}
                    label="Хувь хүний ур чадвар"
                    value={selectedApp.personalSkills}
                  />
                  <DetailItem
                    icon={Languages}
                    label="Гадаад хэлний мэдлэг"
                    value={selectedApp.languages}
                  />
                </div>
              </div>

              {selectedApp.status === "PENDING" && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleAction(selectedApp.id, "approve")}
                    disabled={actionId === selectedApp.id}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {actionId === selectedApp.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    Зөвшөөрөх
                  </button>
                  <button
                    onClick={() => handleAction(selectedApp.id, "reject")}
                    disabled={actionId === selectedApp.id}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
                  >
                    {actionId === selectedApp.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <X size={16} />
                    )}
                    Татгалзах
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
