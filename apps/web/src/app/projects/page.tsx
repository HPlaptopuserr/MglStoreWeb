"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FeaturedProjectsRail } from "@/components/molecules/projects/FeaturedProjectsRail";
import { ProjectGridCard } from "@/components/molecules/projects/ProjectGridCard";
import { LockedProjectPreviewModal } from "@/components/molecules/projects/ProjectPdfPreview";
import {
  PaidAccessPaymentModal,
  type PaidAccessPaymentSession,
} from "@/components/molecules/payments/PaidAccessPaymentModal";
import { ProjectsHero } from "@/components/molecules/projects/ProjectsHero";
import type {
  ProjectItem,
  ProjectShowcaseSection,
} from "@/components/molecules/projects/project-types";

export default function ProjectsPage() {
  const router = useRouter();
  const { user, authFetch } = useAuth();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectShowcaseSections, setProjectShowcaseSections] = useState<
    ProjectShowcaseSection[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [previewProject, setPreviewProject] = useState<ProjectItem | null>(
    null,
  );
  const [paymentProject, setPaymentProject] = useState<ProjectItem | null>(
    null,
  );
  const [paymentSession, setPaymentSession] =
    useState<PaidAccessPaymentSession | null>(null);
  const hasMemberAccess = Boolean(user?.membership?.active || user?.isPrime);
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
        const res = await fetch(`${API}/site-settings/projects`, {
          cache: "no-store",
        });
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

  const openProjectDetailPage = (projectId: string, invoiceId?: string) => {
    const query = invoiceId
      ? `?${new URLSearchParams({ invoiceId }).toString()}`
      : "";
    router.push(`/projects/${projectId}${query}`);
  };

  const openPaidProject = async (project: ProjectItem, invoiceId: string) => {
    setPreviewProject(null);
    setPaymentProject(null);
    setPaymentSession(null);
    openProjectDetailPage(project.id, invoiceId);
  };

  const openProject = (project: ProjectItem) => {
    if (project.price && project.price > 0 && hasMemberAccess) {
      openProjectDetailPage(project.id);
      return;
    }

    if (project.price && project.price > 0) {
      setPreviewProject(project);
      return;
    }

    openProjectDetailPage(project.id);
  };

  const unlockProject = async (project: ProjectItem) => {
    try {
      setOpeningId(project.id);
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
        setPreviewProject(null);
        openProjectDetailPage(project.id);
        return;
      }

      setPreviewProject(null);
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
          : "Төлбөрийн QR үүсгэхэд алдаа гарлаа",
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

      {previewProject && (
        <LockedProjectPreviewModal
          kindLabel="Төсөл"
          project={previewProject}
          opening={openingId === previewProject.id}
          hasFullAccess={hasMemberAccess}
          onClose={() => setPreviewProject(null)}
          onUnlock={() => unlockProject(previewProject)}
        />
      )}

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

    </div>
  );
}
