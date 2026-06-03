"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  QrCode,
  Smartphone,
  X,
} from "lucide-react";
import { QrGenerator } from "@mgl/ui";
import { API } from "@/lib/api";
import { FeaturedProjectsRail } from "@/components/molecules/projects/FeaturedProjectsRail";
import { ProjectGridCard } from "@/components/molecules/projects/ProjectGridCard";
import { ProjectsHero } from "@/components/molecules/projects/ProjectsHero";
import type {
  ProjectItem,
  ProjectShowcaseSection,
} from "@/components/molecules/projects/project-types";
import {
  formatMnt,
  getProjectImages,
} from "@/components/molecules/projects/project-utils";

type DeepLink = {
  name: string;
  description: string;
  logo: string;
  link: string;
};

type ProjectPaymentSession = {
  invoiceId: string;
  providerInvoiceId?: string;
  amount: number;
  qrText: string;
  qrImage: string;
  urls: DeepLink[];
  expiresAt?: string;
};

function ProjectDetailModal({
  project,
  onClose,
}: {
  project: ProjectItem;
  onClose: () => void;
}) {
  const images = getProjectImages(project);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
        aria-label="Хаах"
      />
      <article className="relative z-10 max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-orange-200/20 bg-[#111113] text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
              Төсөл
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">
              {project.title}
            </h2>
            <p className="mt-2 text-sm font-bold text-orange-200">
              Төлбөр баталгаажсан тул дэлгэрэнгүй мэдээлэл болон PDF нээгдлээ
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
            aria-label="Хаах"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
          {images.length > 0 && (
            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              {images.map((image, index) => (
                <img
                  key={`${image}-${index}`}
                  src={image}
                  alt={`${project.title} зураг ${index + 1}`}
                  className="h-64 w-full rounded-xl border border-white/10 object-cover"
                />
              ))}
            </div>
          )}

          {(project.details || project.summary) && (
            <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4">
              {(project.details || project.summary || "")
                .split("\n")
                .map((line, index) => (
                  <p
                    key={index}
                    className="whitespace-pre-wrap text-base leading-8 text-orange-50/80"
                  >
                    {line || "\u00A0"}
                  </p>
                ))}
            </div>
          )}

          {project.pdfUrl ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
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
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-300 px-5 py-3 text-sm font-black text-black transition hover:brightness-110"
              >
                <FileText className="h-4 w-4" />
                PDF-г шинэ цонхонд нээх
              </a>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-orange-200/30 bg-white/[0.03] p-8 text-center text-sm font-bold text-orange-100/70">
              PDF файл оруулаагүй байна.
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

function ProjectPaymentModal({
  project,
  payment,
  onPaid,
  onClose,
}: {
  project: ProjectItem;
  payment: ProjectPaymentSession;
  onPaid: (invoiceId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const qrImageSrc = payment.qrImage
    ? payment.qrImage.startsWith("data:")
      ? payment.qrImage
      : `data:image/png;base64,${payment.qrImage}`
    : "";

  const checkPayment = useCallback(async () => {
    const params = new URLSearchParams({
      invoiceId: payment.invoiceId,
      projectId: project.id,
    });
    const res = await fetch(`${API}/site-settings/projects/systemqr/check?${params}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Төлбөр шалгахад алдаа гарлаа");
    }
    if (data.isPaid) {
      if (pollRef.current) clearInterval(pollRef.current);
      setConfirmed(true);
      await onPaid(payment.invoiceId);
      return true;
    }
    return false;
  }, [onPaid, payment.invoiceId, project.id]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (confirmed) return;
    pollRef.current = setInterval(() => {
      checkPayment().catch(() => {});
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [checkPayment, confirmed]);

  const handleManualCheck = async () => {
    setChecking(true);
    setError("");
    try {
      const paid = await checkPayment();
      if (!paid) {
        setError("Төлбөр хүлээгдэж байна. QR уншуулж төлөөд дахин шалгана уу.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Төлбөр шалгахад алдаа гарлаа",
      );
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={confirmed ? undefined : onClose}
        aria-label="Хаах"
      />
      <article className="relative z-10 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white text-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black">Dynamic QR төлбөр</h2>
              <p className="text-xs font-semibold text-slate-400">
                {project.title}
              </p>
            </div>
          </div>
          {!confirmed && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              aria-label="Хаах"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="space-y-5 px-6 py-6">
          {confirmed ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <p className="text-lg font-black">Төлбөр амжилттай</p>
                <p className="mt-1 text-sm text-slate-500">
                  Дэлгэрэнгүй мэдээллийг нээж байна...
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-500">Нэхэмжлэх</span>
                  <span className="truncate font-mono text-slate-700">
                    {payment.invoiceId}
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-sm">
                  <span className="text-slate-500">Дүн</span>
                  <span className="text-lg font-black text-slate-950">
                    {formatMnt(payment.amount)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="rounded-2xl border-2 border-slate-200 bg-white p-3">
                  {qrImageSrc ? (
                    <img
                      src={qrImageSrc}
                      alt="Dynamic QR"
                      className="h-56 w-56 rounded-xl"
                    />
                  ) : payment.qrText ? (
                    <QrGenerator value={payment.qrText} size={224} />
                  ) : (
                    <div className="flex h-56 w-56 items-center justify-center rounded-xl bg-slate-50 text-center text-sm font-bold text-slate-400">
                      QR мэдээлэл ирсэнгүй
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <Smartphone className="h-4 w-4" />
                  <span>Банкны апп эсвэл QPay-ээр уншуулна уу</span>
                </div>
              </div>

              {payment.urls.length > 0 && (
                <div>
                  <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                    Аппаар төлөх
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {payment.urls.map((link) => (
                      <a
                        key={`${link.name}-${link.link}`}
                        href={link.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 p-2.5 transition hover:bg-slate-100"
                      >
                        {link.logo ? (
                          <img
                            src={link.logo}
                            alt={link.name}
                            className="h-8 w-8 rounded-lg object-contain"
                          />
                        ) : (
                          <QrCode className="h-8 w-8 text-slate-400" />
                        )}
                        <span className="line-clamp-2 text-center text-[10px] font-semibold leading-tight text-slate-600">
                          {link.description || link.name}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <p className="rounded-xl bg-amber-50 px-4 py-2 text-center text-sm font-semibold text-amber-700">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleManualCheck}
                disabled={checking}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3.5 text-sm font-black text-white transition hover:bg-cyan-700 disabled:opacity-60"
              >
                {checking ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                {checking ? "Шалгаж байна..." : "Төлбөр шалгах"}
              </button>
            </>
          )}
        </div>
      </article>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectShowcaseSections, setProjectShowcaseSections] = useState<
    ProjectShowcaseSection[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [activeProject, setActiveProject] = useState<ProjectItem | null>(null);
  const [loadedProjects, setLoadedProjects] = useState<Record<string, ProjectItem>>(
    {},
  );
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [paymentProject, setPaymentProject] = useState<ProjectItem | null>(null);
  const [paymentSession, setPaymentSession] =
    useState<ProjectPaymentSession | null>(null);
  const showcaseGroups = useMemo(() => {
    const projectById = new Map(projects.map((project) => [project.id, project]));
    const configured = projectShowcaseSections
      .map((section) => ({
        ...section,
        projects: section.projectIds
          .map((projectId) => projectById.get(projectId))
          .filter((project): project is ProjectItem => Boolean(project)),
      }))
      .filter((section) => section.projects.length > 0);

    if (configured.length > 0) return configured;

    const featuredProjects = projects.filter((project) => project.isFeatured);
    return featuredProjects.length > 0
      ? [
          {
            id: "legacy-featured-projects",
            title: "Төслийн онцлох хэсэг",
            subtitle: "Admin-аас сонгосон төслүүд",
            projectIds: featuredProjects.map((project) => project.id),
            projects: featuredProjects,
          },
        ]
      : [];
  }, [projectShowcaseSections, projects]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${API}/site-settings/projects`);
        if (!res.ok) return;
        const data = await res.json();
        const parsed = Array.isArray(data.projects) ? data.projects : [];
        const showcases = Array.isArray(data.showcaseSections)
          ? data.showcaseSections
          : [];
        setProjects(
          parsed.filter((project: ProjectItem) => project.isActive !== false),
        );
        setProjectShowcaseSections(showcases);
      } catch (error) {
        console.error("Failed to fetch projects", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const fetchProjectDetail = async (projectId: string, invoiceId?: string) => {
    const params = invoiceId
      ? `?${new URLSearchParams({ invoiceId }).toString()}`
      : "";
    const res = await fetch(
      `${API}/site-settings/projects/${projectId}/detail${params}`,
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Төслийн мэдээлэл авахад алдаа гарлаа");
    }
    return data.project as ProjectItem;
  };

  const openPaidProject = async (project: ProjectItem, invoiceId: string) => {
    const detail = await fetchProjectDetail(project.id, invoiceId);
    setLoadedProjects((prev) => ({ ...prev, [project.id]: detail }));
    setPaymentProject(null);
    setPaymentSession(null);
    setActiveProject(detail);
  };

  const openProject = async (project: ProjectItem) => {
    const cachedProject = loadedProjects[project.id];
    if (cachedProject) {
      setActiveProject(cachedProject);
      return;
    }

    try {
      setOpeningId(project.id);
      if (!project.price || project.price <= 0) {
        const detail = await fetchProjectDetail(project.id);
        setLoadedProjects((prev) => ({ ...prev, [project.id]: detail }));
        setActiveProject(detail);
        return;
      }

      const res = await fetch(`${API}/site-settings/projects/systemqr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Төлбөрийн QR үүсгэхэд алдаа гарлаа");
      }
      if (data.free) {
        const detail = await fetchProjectDetail(project.id);
        setLoadedProjects((prev) => ({ ...prev, [project.id]: detail }));
        setActiveProject(detail);
        return;
      }

      setPaymentProject(project);
      setPaymentSession({
        invoiceId: data.invoiceId,
        providerInvoiceId: data.providerInvoiceId,
        amount: Number(data.amount || project.price || 0),
        qrText: String(data.qrText || ""),
        qrImage: String(data.qrImage || ""),
        urls: Array.isArray(data.urls) ? data.urls : [],
        expiresAt: data.expiresAt,
      });
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Төслийн мэдээлэл авахад алдаа гарлаа",
      );
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_42%,#ffffff_100%)] text-slate-950">
      <main
        id="project-list"
        className="relative mx-auto max-w-7xl overflow-hidden px-4 py-10 sm:py-12 lg:px-8 lg:py-16"
      >
        <div className="pointer-events-none absolute left-0 top-0 h-px w-40 bg-orange-300/60" />

        <ProjectsHero loading={loading} projectCount={projects.length} />

        {loading ? (
          <div className="relative z-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-[455px] animate-pulse rounded-xl border border-slate-200 bg-slate-100"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="relative z-10 rounded-xl border border-dashed border-slate-300 bg-white p-14 text-center shadow-sm">
            <p className="text-lg font-bold text-slate-500">
              Одоогоор нийтлэгдсэн төсөл алга байна.
            </p>
          </div>
        ) : (
          <section className="relative z-10">
            {showcaseGroups.map((section) => (
              <FeaturedProjectsRail
                key={section.id}
                title={section.title}
                subtitle={section.subtitle}
                projects={section.projects}
                openingId={openingId}
                onOpen={openProject}
              />
            ))}

            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-700">
                  All projects
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  Бүх төслүүд
                </h2>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
                {projects.length}
              </span>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project, index) => (
                <ProjectGridCard
                  key={project.id}
                  project={project}
                  index={index}
                  openingId={openingId}
                  onOpen={openProject}
                />
              ))}

              <article className="flex min-h-[455px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-8 text-center shadow-sm">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                  <Plus className="h-8 w-8" />
                </div>
                <h3 className="mt-7 text-lg font-black text-slate-950">
                  Шинэ төсөл удахгүй
                </h3>
                <p className="mt-3 max-w-xs text-sm font-semibold leading-6 text-slate-500">
                  Бид удахгүй шинэ төсөл, хамтын ажиллагааны боломжуудыг нэмэх
                  болно.
                </p>
              </article>
            </div>
          </section>
        )}
      </main>

      {paymentProject && paymentSession && (
        <ProjectPaymentModal
          project={paymentProject}
          payment={paymentSession}
          onPaid={(invoiceId) => openPaidProject(paymentProject, invoiceId)}
          onClose={() => {
            setPaymentProject(null);
            setPaymentSession(null);
          }}
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
