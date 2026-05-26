"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  LockKeyhole,
  QrCode,
  ShieldCheck,
  X,
} from "lucide-react";
import { API } from "@/lib/api";

type PaidProject = {
  id: string;
  title: string;
  category?: string;
  summary?: string;
  details?: string;
  price?: number;
  imageUrl?: string;
  pdfUrl?: string;
  tags?: string[];
  isActive?: boolean;
};

type DeepLink = {
  name: string;
  description: string;
  logo: string;
  link: string;
};

type ProjectInvoice = {
  orderId: string;
  orderNumber: string;
  projectId: string;
  amount: number;
  invoiceId: string;
  accessToken: string;
  qrImage: string;
  urls: DeepLink[];
};

function formatMnt(amount: number) {
  return `₮${Math.max(0, Number(amount) || 0).toLocaleString("mn-MN")}`;
}

function ProjectDetailModal({
  project,
  onClose,
}: {
  project: PaidProject;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Хаах"
      />
      <article className="relative z-10 max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase text-[#FFAD02]">
              Franchise
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {project.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
          {!project.pdfUrl && project.imageUrl && (
            <img
              src={project.imageUrl}
              alt={project.title}
              className="mb-6 h-64 w-full rounded-lg object-cover"
            />
          )}
          {project.pdfUrl ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                <iframe
                  src={project.pdfUrl}
                  title={`${project.title} PDF`}
                  className="h-[70vh] w-full bg-white"
                />
              </div>
              <a
                href={project.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-black text-white transition hover:bg-[#FFAD02] hover:text-black"
              >
                <FileText className="h-4 w-4" />
                PDF-г шинэ цонхонд нээх
              </a>
            </div>
          ) : (
            <div className="prose prose-slate max-w-none">
              {(
                project.details ||
                project.summary ||
                "PDF файл оруулаагүй байна."
              )
                .split("\n")
                .map((line, index) => (
                  <p
                    key={index}
                    className="whitespace-pre-wrap text-base leading-8 text-slate-700"
                  >
                    {line || "\u00A0"}
                  </p>
                ))}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

function ProjectQPayModal({
  invoice,
  onSuccess,
  onClose,
}: {
  invoice: ProjectInvoice;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkPayment = useCallback(async () => {
    try {
      const res = await fetch(
        `${API}/site-settings/projects/qpay/check?invoiceId=${invoice.invoiceId}`,
      );
      const data = await res.json();
      if (data.isPaid) {
        if (pollRef.current) clearInterval(pollRef.current);
        setConfirmed(true);
        setTimeout(onSuccess, 1200);
        return true;
      }
    } catch {
      // retry on next poll/manual check
    }
    return false;
  }, [invoice.invoiceId, onSuccess]);

  useEffect(() => {
    pollRef.current = setInterval(() => {
      checkPayment();
    }, 3000);
    document.body.style.overflow = "hidden";
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      document.body.style.overflow = "";
    };
  }, [checkPayment]);

  const handleCheck = async () => {
    setChecking(true);
    setError("");
    const paid = await checkPayment();
    if (!paid) setError("Төлбөр хараахан баталгаажаагүй байна.");
    setChecking(false);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={confirmed ? undefined : onClose}
        aria-label="Хаах"
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-950">
                Franchise PDF төлбөр
              </h2>
              <p className="text-xs text-slate-400">{invoice.orderNumber}</p>
            </div>
          </div>
          {!confirmed && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="space-y-5 px-6 py-6">
          {confirmed ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-emerald-500" />
              <p className="text-lg font-black text-slate-950">
                Төлбөр амжилттай
              </p>
              <p className="text-sm text-slate-500">PDF файлыг нээж байна.</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-500">
                    Нийт төлөх
                  </span>
                  <span className="text-xl font-black text-slate-950">
                    {formatMnt(invoice.amount)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <img
                    src={`data:image/png;base64,${invoice.qrImage}`}
                    alt="QPay QR"
                    className="h-56 w-56 rounded-lg"
                  />
                </div>
                <p className="text-center text-sm text-slate-500">
                  QPay эсвэл банкны апп-аар QR уншуулна уу.
                </p>
              </div>
              {invoice.urls?.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {invoice.urls.slice(0, 8).map((link) => (
                    <a
                      key={link.name}
                      href={link.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 p-2 text-center text-[10px] font-bold text-slate-500 hover:bg-slate-100"
                    >
                      <img
                        src={link.logo}
                        alt={link.name}
                        className="h-7 w-7 rounded-lg object-contain"
                      />
                      <span className="line-clamp-2">{link.description}</span>
                    </a>
                  ))}
                </div>
              )}
              {error && (
                <p className="rounded-xl bg-amber-50 px-4 py-2 text-center text-sm text-amber-700">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={handleCheck}
                disabled={checking}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 py-3.5 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {checking ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                Төлбөр шалгах
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<PaidProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [qpay, setQpay] = useState<ProjectInvoice | null>(null);
  const [activeProject, setActiveProject] = useState<PaidProject | null>(null);
  const [unlockedProjects, setUnlockedProjects] = useState<
    Record<string, PaidProject>
  >({});
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${API}/site-settings/projects`);
        if (!res.ok) return;
        const data = await res.json();
        const parsed = Array.isArray(data.projects) ? data.projects : [];
        if (Array.isArray(parsed)) {
          setProjects(
            parsed.filter((project: PaidProject) => project.isActive !== false),
          );
        }
      } catch (error) {
        console.error("Failed to fetch projects", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const getProjectAccessKey = (projectId: string) =>
    `mgl-project-access:${projectId}`;

  const fetchProjectDetail = async (
    projectId: string,
    invoice?: Pick<ProjectInvoice, "invoiceId" | "accessToken">,
  ) => {
    const params = new URLSearchParams();
    if (invoice) {
      params.set("invoiceId", invoice.invoiceId);
      params.set("accessToken", invoice.accessToken);
    }

    const suffix = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(
      `${API}/site-settings/projects/${projectId}/detail${suffix}`,
    );
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Franchise PDF авахад алдаа гарлаа");
    }
    return data.project as PaidProject;
  };

  const openProject = async (project: PaidProject) => {
    const price = Number(project.price) || 0;
    const cachedProject = unlockedProjects[project.id];
    if (cachedProject) {
      setActiveProject(cachedProject);
      return;
    }

    try {
      setPayingId(project.id);
      if (price <= 0) {
        const detail = await fetchProjectDetail(project.id);
        setUnlockedProjects((prev) => ({ ...prev, [project.id]: detail }));
        setActiveProject(detail);
        return;
      }

      const storedAccess = localStorage.getItem(
        getProjectAccessKey(project.id),
      );
      if (storedAccess) {
        try {
          const parsed = JSON.parse(storedAccess) as Pick<
            ProjectInvoice,
            "invoiceId" | "accessToken"
          >;
          const detail = await fetchProjectDetail(project.id, parsed);
          setUnlockedProjects((prev) => ({ ...prev, [project.id]: detail }));
          setActiveProject(detail);
          return;
        } catch {
          localStorage.removeItem(getProjectAccessKey(project.id));
        }
      }

      const res = await fetch(`${API}/site-settings/projects/qpay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await res.json();
      if (data.free) {
        const detail = await fetchProjectDetail(project.id);
        setUnlockedProjects((prev) => ({ ...prev, [project.id]: detail }));
        setActiveProject(detail);
      } else if (data.success) {
        setQpay(data);
      } else {
        alert(data.message || "Төлбөр үүсгэхэд алдаа гарлаа");
      }
    } catch (error) {
      console.error(error);
      alert("Холболтын алдаа гарлаа");
    } finally {
      setPayingId(null);
    }
  };

  const handlePaid = async () => {
    if (!qpay) return;
    try {
      const project = await fetchProjectDetail(qpay.projectId, qpay);
      localStorage.setItem(
        getProjectAccessKey(qpay.projectId),
        JSON.stringify({
          invoiceId: qpay.invoiceId,
          accessToken: qpay.accessToken,
        }),
      );
      setUnlockedProjects((prev) => ({ ...prev, [qpay.projectId]: project }));
      setQpay(null);
      setActiveProject(project);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Franchise PDF авахад алдаа гарлаа",
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f4ed] text-slate-950">
      <main
        id="project-list"
        className="mx-auto max-w-7xl px-4 py-10 sm:py-12 lg:px-8 lg:py-14"
      >
        <div className="mb-8 flex flex-col gap-4 border-b border-black/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase text-[#d78f00]">
              Franchise
            </p>
            <h1 className="mt-2 break-words text-3xl font-black leading-tight sm:text-4xl md:text-5xl">
              Franchise боломжууд
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Зураг, нэр, үнэ, хураангуйг харж сонгоод төлбөр төлсний дараа
              franchise PDF файлыг нээнэ.
            </p>
          </div>
          <p className="text-sm font-bold text-slate-500 md:text-right">
            {loading
              ? "Franchise ачаалж байна."
              : `${projects.length} franchise бэлэн байна.`}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-500">
            <Loader2 className="mr-3 h-6 w-6 animate-spin text-[#FFAD02]" />
            Franchise ачаалж байна...
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-14 text-center shadow-sm">
            <p className="text-lg font-bold text-slate-700">
              Одоогоор нийтлэгдсэн franchise алга байна.
            </p>
          </div>
        ) : (
          <section>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => {
                const price = Number(project.price) || 0;
                const unlocked = !!unlockedProjects[project.id] || price <= 0;
                return (
                  <article
                    key={project.id}
                    className="group overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="relative aspect-[16/10] bg-black">
                      {project.imageUrl ? (
                        <img
                          src={project.imageUrl}
                          alt={project.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-black text-white">
                          <ShieldCheck className="h-14 w-14 text-[#FFAD02]" />
                          <span className="text-sm font-black uppercase">
                            MGL Store franchise
                          </span>
                        </div>
                      )}
                      {!unlocked && (
                        <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-black/85 px-3 py-1 text-xs font-black text-white backdrop-blur">
                          <LockKeyhole className="h-3.5 w-3.5" />
                          {formatMnt(price)}
                        </div>
                      )}
                    </div>
                    <div className="flex min-h-[270px] flex-col p-5">
                      <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
                        <span>
                          {unlocked ? "PDF нээлттэй" : "Төлбөртэй PDF"}
                        </span>
                        <span className="text-slate-950">
                          {unlocked ? "Үнэгүй" : formatMnt(price)}
                        </span>
                      </div>
                      <h2 className="mt-3 line-clamp-2 text-2xl font-black leading-tight text-slate-950">
                        {project.title}
                      </h2>
                      <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-600">
                        {project.summary ||
                          "Хураангуй мэдээлэл оруулаагүй байна."}
                      </p>
                      <button
                        type="button"
                        onClick={() => openProject(project)}
                        disabled={payingId === project.id}
                        className="mt-auto flex w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-sm font-black text-white transition hover:bg-[#FFAD02] hover:text-black disabled:opacity-60"
                      >
                        {payingId === project.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <ArrowRight className="h-5 w-5" />
                        )}
                        {unlocked ? "PDF үзэх" : "Төлж PDF үзэх"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {qpay && (
        <ProjectQPayModal
          invoice={qpay}
          onSuccess={handlePaid}
          onClose={() => setQpay(null)}
        />
      )}
      {activeProject && (
        <ProjectDetailModal
          project={activeProject}
          onClose={() => setActiveProject(null)}
        />
      )}
    </div>
  );
}
