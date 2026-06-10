"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, X } from "lucide-react";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FeaturedProjectsRail } from "@/components/molecules/projects/FeaturedProjectsRail";
import { ProjectGridCard } from "@/components/molecules/projects/ProjectGridCard";
import {
  PaidAccessPaymentModal,
  type PaidAccessPaymentSession,
} from "@/components/molecules/payments/PaidAccessPaymentModal";
import { ProjectsHero } from "@/components/molecules/projects/ProjectsHero";
import type {
  ProjectItem,
  ProjectShowcaseSection,
} from "@/components/molecules/projects/project-types";
import {
  formatMnt,
  getResolvedProjectImages,
  resolveProjectFileUrl,
} from "@/components/molecules/projects/project-utils";

function ProjectDetailModal({
  project,
  onClose,
}: {
  project: ProjectItem;
  onClose: () => void;
}) {
  const images = getResolvedProjectImages(project);
  const pdfUrl = resolveProjectFileUrl(project.pdfUrl);

  useEffect(() => {
    const scrollY = window.scrollY;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const { overflow, paddingRight, position, top, width } =
      document.body.style;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      document.body.style.position = position;
      document.body.style.top = top;
      document.body.style.width = width;
      window.scrollTo(0, scrollY);
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

        <div className="max-h-[70vh] overscroll-contain overflow-y-auto px-6 py-6">
          {images.length > 0 && (
            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              {images.map((image, index) => (
                <ProjectDetailImage
                  key={`${image}-${index}`}
                  src={image}
                  alt={`${project.title} зураг ${index + 1}`}
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

          {pdfUrl ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
                <iframe
                  src={pdfUrl}
                  title={`${project.title} PDF`}
                  className="h-[70vh] w-full bg-white"
                />
              </div>
              <a
                href={pdfUrl}
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

function ProjectDetailImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm font-bold text-white/50">
        Зураг ачаалсангүй
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="h-64 w-full rounded-xl border border-white/10 object-cover"
    />
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const { user, authFetch } = useAuth();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectShowcaseSections, setProjectShowcaseSections] = useState<
    ProjectShowcaseSection[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [activeProject, setActiveProject] = useState<ProjectItem | null>(null);
  const [loadedProjects, setLoadedProjects] = useState<
    Record<string, ProjectItem>
  >({});
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [paymentProject, setPaymentProject] = useState<ProjectItem | null>(
    null,
  );
  const [paymentSession, setPaymentSession] =
    useState<PaidAccessPaymentSession | null>(null);
  const showcaseGroups = useMemo(() => {
    const projectById = new Map(
      projects.map((project) => [project.id, project]),
    );
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
    const res = await authFetch(
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

      if (!user) {
        router.push("/login");
        return;
      }

      const res = await authFetch(`${API}/site-settings/projects/systemqr`, {
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
        <PaidAccessPaymentModal
          itemId={paymentProject.id}
          title={paymentProject.title}
          payment={paymentSession}
          checkUrl={`${API}/site-settings/projects/systemqr/check`}
          request={authFetch}
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
