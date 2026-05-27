"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  FileText,
  ImagePlus,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import { API } from "@/lib/api";

type FranchiseProject = {
  id: string;
  title: string;
  category?: string;
  summary?: string;
  details?: string;
  price?: number;
  imageUrl?: string;
  imageUrls?: string[];
  pdfUrl?: string;
  tags?: string[];
  isActive?: boolean;
};

function getProjectImages(project: FranchiseProject) {
  return Array.from(
    new Set(
      [
        ...(Array.isArray(project.imageUrls) ? project.imageUrls : []),
        project.imageUrl,
      ]
        .filter((url): url is string => typeof url === "string")
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  );
}

function ProjectDetailModal({
  project,
  onClose,
}: {
  project: FranchiseProject;
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
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Хаах"
      />
      <article className="relative z-10 max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase text-[#FFAD02]">
              Franchise
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {project.title}
            </h2>
            <p className="mt-1 text-sm font-bold text-emerald-600">
              Үнэгүй үзэх боломжтой
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
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
                  className="h-64 w-full rounded-lg border border-slate-200 object-cover"
                />
              ))}
            </div>
          )}

          {(project.details || project.summary) && (
            <div className="mb-6 rounded-lg bg-slate-50 px-5 py-4">
              {(project.details || project.summary || "")
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
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
              PDF файл оруулаагүй байна.
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<FranchiseProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProject, setActiveProject] =
    useState<FranchiseProject | null>(null);
  const [loadedProjects, setLoadedProjects] = useState<
    Record<string, FranchiseProject>
  >({});
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${API}/site-settings/projects`);
        if (!res.ok) return;
        const data = await res.json();
        const parsed = Array.isArray(data.projects) ? data.projects : [];
        setProjects(
          parsed.filter(
            (project: FranchiseProject) => project.isActive !== false,
          ),
        );
      } catch (error) {
        console.error("Failed to fetch projects", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const fetchProjectDetail = async (projectId: string) => {
    const res = await fetch(`${API}/site-settings/projects/${projectId}/detail`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Franchise PDF авахад алдаа гарлаа");
    }
    return data.project as FranchiseProject;
  };

  const openProject = async (project: FranchiseProject) => {
    const cachedProject = loadedProjects[project.id];
    if (cachedProject) {
      setActiveProject(cachedProject);
      return;
    }

    try {
      setOpeningId(project.id);
      const detail = await fetchProjectDetail(project.id);
      setLoadedProjects((prev) => ({ ...prev, [project.id]: detail }));
      setActiveProject(detail);
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Franchise мэдээлэл авахад алдаа гарлаа",
      );
    } finally {
      setOpeningId(null);
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
              Franchise зураг, танилцуулга, PDF файлыг төлбөргүйгээр шууд нээж
              үзнэ.
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
                const images = getProjectImages(project);
                const primaryImage = images[0];
                return (
                  <article
                    key={project.id}
                    className="group overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="relative aspect-[16/10] bg-black">
                      {primaryImage ? (
                        <img
                          src={primaryImage}
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
                      <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-black text-white shadow-sm">
                        Үнэгүй
                      </div>
                      {images.length > 1 && (
                        <div className="absolute bottom-4 left-4 inline-flex items-center gap-1 rounded-full bg-black/80 px-3 py-1 text-xs font-black text-white backdrop-blur">
                          <ImagePlus className="h-3.5 w-3.5" />
                          {images.length} зураг
                        </div>
                      )}
                    </div>
                    <div className="flex min-h-[260px] flex-col p-5">
                      <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
                        <span>PDF нээлттэй</span>
                        <span className="text-emerald-600">Үнэгүй</span>
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
                        disabled={openingId === project.id}
                        className="mt-auto flex w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-sm font-black text-white transition hover:bg-[#FFAD02] hover:text-black disabled:opacity-60"
                      >
                        {openingId === project.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <ArrowRight className="h-5 w-5" />
                        )}
                      Үзэх
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {activeProject && (
        <ProjectDetailModal
          project={activeProject}
          onClose={() => setActiveProject(null)}
        />
      )}
    </div>
  );
}
