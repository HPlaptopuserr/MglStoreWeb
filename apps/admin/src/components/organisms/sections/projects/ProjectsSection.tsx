"use client";

import { useState, type ChangeEvent } from "react";
import {
  Check,
  Eye,
  EyeOff,
  FileText,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import type { ProjectItem } from "@/lib/sections/types";
import { API, adminFetch } from "@/lib/api";

const generateId = () => Math.random().toString(36).slice(2, 10);
const MAX_PROJECT_IMAGES = 12;

type Props = {
  projects: ProjectItem[];
  setProjects: (
    update: ProjectItem[] | ((prev: ProjectItem[]) => ProjectItem[]),
  ) => void;
  onSave: (
    currentProjects?: ProjectItem[],
  ) => Promise<boolean | void> | boolean | void;
  saving?: boolean;
  saved?: boolean;
};

const emptyProject = (): ProjectItem => ({
  id: generateId(),
  title: "Шинэ franchise",
  category: "Franchise",
  summary: "",
  details: "",
  price: 0,
  imageUrl: "",
  imageUrls: [],
  pdfUrl: "",
  tags: [],
  isActive: true,
});

function getProjectImages(project?: ProjectItem) {
  if (!project) return [];

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

function parseImageUrls(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,]+/)
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  ).slice(0, MAX_PROJECT_IMAGES);
}

function tagText(project: ProjectItem) {
  return (project.tags || []).join(", ");
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function uploadErrorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  const record = data as Record<string, unknown>;
  const message = typeof record.message === "string" ? record.message : "";
  const detail = typeof record.detail === "string" ? record.detail : "";
  return [message, detail].filter(Boolean).join(": ") || fallback;
}

function compressImage(
  file: File,
  maxWidth = 1600,
  quality = 0.84,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Зураг боловсруулахад алдаа гарлаа"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("Зураг шахахад алдаа гарлаа")),
        "image/jpeg",
        quality,
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function ProjectsSection({
  projects,
  setProjects,
  onSave,
  saving,
  saved,
}: Props) {
  const [uploadingProjectId, setUploadingProjectId] = useState<string | null>(
    null,
  );
  const [uploadingPdfProjectId, setUploadingPdfProjectId] = useState<
    string | null
  >(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(
    null,
  );
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [pdfUploadError, setPdfUploadError] = useState("");

  const addProject = () => {
    const project = emptyProject();
    setProjects((prev) => [project, ...prev]);
    setEditingProjectId(project.id);
  };

  const updateProject = <K extends keyof ProjectItem>(
    id: string,
    field: K,
    value: ProjectItem[K],
  ) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === id ? { ...project, [field]: value } : project,
      ),
    );
  };

  const updateProjectImages = (id: string, imageUrls: string[]) => {
    const nextImages = Array.from(
      new Set(imageUrls.map((url) => url.trim()).filter(Boolean)),
    ).slice(0, MAX_PROJECT_IMAGES);

    setProjects((prev) =>
      prev.map((project) =>
        project.id === id
          ? {
              ...project,
              imageUrl: nextImages[0] ?? "",
              imageUrls: nextImages,
            }
          : project,
      ),
    );
  };

  const removeProject = async (id: string) => {
    if (!confirm("Энэ franchise-ийг устгах уу?")) return;
    const previousProjects = projects;
    const nextProjects = projects.filter((project) => project.id !== id);
    setProjects(nextProjects);
    if (editingProjectId === id) setEditingProjectId(null);

    setDeletingProjectId(id);
    const result = await onSave(nextProjects);
    if (result === false) {
      setProjects(previousProjects);
      if (editingProjectId === id) setEditingProjectId(id);
    }
    setDeletingProjectId(null);
  };

  const saveProjectEdits = async () => {
    const result = await onSave(projects);
    if (result !== false) setEditingProjectId(null);
  };

  const uploadProjectImage = async (
    id: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selectedFiles.length === 0) return;

    const currentImages = getProjectImages(
      projects.find((project) => project.id === id),
    );
    const remainingSlots = MAX_PROJECT_IMAGES - currentImages.length;
    if (remainingSlots <= 0) {
      setUploadError(`${MAX_PROJECT_IMAGES} хүртэл зураг оруулах боломжтой.`);
      return;
    }

    const files = selectedFiles.slice(0, remainingSlots);

    setUploadingProjectId(id);
    setUploadError("");
    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        try {
          const compressed = await compressImage(file);
          const form = new FormData();
          form.append("image", compressed, "project.jpg");
          const res = await adminFetch(`${API}/site-settings/banner-upload`, {
            method: "POST",
            body: form,
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok)
            throw new Error(
              uploadErrorMessage(data, "Зураг upload хийхэд алдаа гарлаа"),
            );
          if (typeof data.url !== "string" || !data.url) {
            throw new Error("Зургийн URL серверээс ирсэнгүй");
          }
          uploadedUrls.push(data.url);
        } catch (error) {
          try {
            uploadedUrls.push(
              await blobToDataUrl(await compressImage(file, 900, 0.72)),
            );
          } catch {
            throw error;
          }
        }
      }

      updateProjectImages(id, [...currentImages, ...uploadedUrls]);
      if (selectedFiles.length > files.length) {
        setUploadError(
          `${MAX_PROJECT_IMAGES} хүртэл зураг хадгална. Илүү сонгосон зураг нэмэгдсэнгүй.`,
        );
      }
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Зураг upload хийхэд алдаа гарлаа",
      );
    } finally {
      setUploadingProjectId(null);
    }
  };

  const uploadProjectPdf = async (
    id: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setPdfUploadError("Зөвхөн PDF файл оруулна уу.");
      return;
    }

    setUploadingPdfProjectId(id);
    setPdfUploadError("");
    try {
      const form = new FormData();
      form.append("pdf", file);
      const res = await adminFetch(`${API}/site-settings/project-pdf-upload`, {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          uploadErrorMessage(data, "PDF upload хийхэд алдаа гарлаа"),
        );
      if (typeof data.url !== "string" || !data.url) {
        throw new Error("PDF URL серверээс ирсэнгүй");
      }
      updateProject(id, "pdfUrl", data.url);
    } catch (error) {
      setPdfUploadError(
        error instanceof Error
          ? error.message
          : "PDF upload хийхэд алдаа гарлаа",
      );
    } finally {
      setUploadingPdfProjectId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">
            Franchise PDF хэсэг
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Web дээр зураг, нэр, хураангуй харагдаж, PDF файл үнэгүй нээгдэнэ.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addProject}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            Franchise нэмэх
          </button>
          <button
            type="button"
            onClick={() => void onSave(projects)}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
          >
            {saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saved ? "Хадгалагдсан" : saving ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <p className="text-sm font-semibold text-slate-500">
            Одоогоор franchise оруулаагүй байна.
          </p>
          <button
            type="button"
            onClick={addProject}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            Эхний franchise нэмэх
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project, index) => {
            const isEditing = editingProjectId === project.id;
            const isDeleting = deletingProjectId === project.id;
            const projectImages = getProjectImages(project);
            const primaryImage = projectImages[0];

            return (
              <article
                key={project.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">
                      Franchise #{index + 1}
                    </p>
                    <h3 className="mt-1 text-lg font-black text-slate-950">
                      {project.title || "Нэргүй franchise"}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {project.category || "Ангилалгүй"} ·{" "}
                      Үнэгүй
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateProject(project.id, "isActive", !project.isActive)
                      }
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${
                        project.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {project.isActive ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                      {project.isActive ? "Web дээр харагдана" : "Нуусан"}
                    </button>
                    {isEditing ? (
                      <button
                        type="button"
                        onClick={() => void saveProjectEdits()}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-700 disabled:opacity-60"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Хадгалах
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingProjectId(project.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                      >
                        <Pencil className="h-4 w-4" />
                        Засах
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void removeProject(project.id)}
                      disabled={isDeleting || saving}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-60"
                      aria-label="Franchise устгах"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Franchise нэр
                      </span>
                      <input
                        value={project.title}
                        onChange={(e) =>
                          updateProject(project.id, "title", e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        placeholder="Жишээ: MGL Store franchise багц"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Ангилал
                      </span>
                      <input
                        value={project.category}
                        onChange={(e) =>
                          updateProject(project.id, "category", e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        placeholder="Franchise, салбар нээх эрх..."
                      />
                    </label>
                    <div className="space-y-1.5 lg:col-span-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Зургууд
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          {projectImages.length}/{MAX_PROJECT_IMAGES}
                        </span>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-2">
                        {projectImages.length > 0 ? (
                          <div className="mb-3 grid grid-cols-3 gap-2">
                            {projectImages.map((image, imageIndex) => (
                              <div
                                key={`${image}-${imageIndex}`}
                                className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-white"
                              >
                                <img
                                  src={image}
                                  alt={`${project.title || "Franchise"} зураг ${imageIndex + 1}`}
                                  className="h-full w-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateProjectImages(
                                      project.id,
                                      projectImages.filter(
                                        (_, indexToKeep) =>
                                          indexToKeep !== imageIndex,
                                      ),
                                    )
                                  }
                                  className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-red-600 opacity-0 shadow-sm transition group-hover:opacity-100"
                                  aria-label="Зураг устгах"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mb-3 flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-slate-400">
                            <ImagePlus className="h-7 w-7" />
                          </div>
                        )}
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50">
                          {uploadingProjectId === project.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ImagePlus className="h-4 w-4" />
                          )}
                          {uploadingProjectId === project.id
                            ? "Зураг оруулж байна..."
                            : "Зурагнууд сонгох"}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            disabled={
                              uploadingProjectId === project.id ||
                              projectImages.length >= MAX_PROJECT_IMAGES
                            }
                            onChange={(e) => uploadProjectImage(project.id, e)}
                          />
                        </label>
                        {uploadError && uploadingProjectId === null && (
                          <p className="mt-2 text-xs font-semibold text-red-500">
                            {uploadError}
                          </p>
                        )}
                      </div>
                      <textarea
                        value={projectImages.join("\n")}
                        onChange={(e) =>
                          updateProjectImages(
                            project.id,
                            parseImageUrls(e.target.value),
                          )
                        }
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        placeholder="Зургийн URL-уудыг мөр мөрөөр оруулж болно"
                      />
                    </div>
                    <label className="space-y-1.5 lg:col-span-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Tag-ууд
                      </span>
                      <input
                        value={tagText(project)}
                        onChange={(e) =>
                          updateProject(
                            project.id,
                            "tags",
                            parseTags(e.target.value),
                          )
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        placeholder="ус, хөрөнгө оруулалт, сум орон нутаг"
                      />
                    </label>
                    <label className="space-y-1.5 lg:col-span-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Хураангуй
                      </span>
                      <textarea
                        value={project.summary}
                        onChange={(e) =>
                          updateProject(project.id, "summary", e.target.value)
                        }
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        placeholder="Web дээр үнэгүй харагдах богино танилцуулга..."
                      />
                    </label>
                    <div className="space-y-1.5 lg:col-span-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Franchise PDF файл
                      </span>
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50">
                            {uploadingPdfProjectId === project.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                            {uploadingPdfProjectId === project.id
                              ? "PDF оруулж байна..."
                              : "PDF сонгох"}
                            <input
                              type="file"
                              accept="application/pdf,.pdf"
                              className="hidden"
                              disabled={uploadingPdfProjectId === project.id}
                              onChange={(e) => uploadProjectPdf(project.id, e)}
                            />
                          </label>
                          {project.pdfUrl && (
                            <a
                              href={project.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"
                            >
                              <FileText className="h-4 w-4" />
                              PDF харах
                            </a>
                          )}
                        </div>
                        {pdfUploadError && uploadingPdfProjectId === null && (
                          <p className="mt-2 text-xs font-semibold text-red-500">
                            {pdfUploadError}
                          </p>
                        )}
                      </div>
                      <input
                        value={project.pdfUrl || ""}
                        onChange={(e) =>
                          updateProject(project.id, "pdfUrl", e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        placeholder="PDF upload хийсний дараа URL энд автоматаар орно"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 md:flex-row md:items-start">
                    {primaryImage ? (
                      <div className="relative h-28 w-full overflow-hidden rounded-xl border border-slate-200 md:w-40">
                        <img
                          src={primaryImage}
                          alt={project.title || "Project image"}
                          className="h-full w-full object-cover"
                        />
                        {projectImages.length > 1 && (
                          <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
                            +{projectImages.length - 1}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex h-28 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-400 md:w-40">
                        <ImagePlus className="h-7 w-7" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm leading-6 text-slate-600">
                        {project.summary ||
                          "Хураангуй мэдээлэл оруулаагүй байна."}
                      </p>
                      <div
                        className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
                          project.pdfUrl
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {project.pdfUrl ? "PDF холбогдсон" : "PDF оруулаагүй"}
                      </div>
                      {project.tags && project.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {project.tags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
