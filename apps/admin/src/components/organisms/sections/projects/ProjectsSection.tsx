"use client";

import { useState, type ChangeEvent } from "react";
import {
  Check,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import type { ProjectItem } from "@/lib/sections/types";
import { API, adminFetch } from "@/lib/api";

const generateId = () => Math.random().toString(36).slice(2, 10);

type Props = {
  projects: ProjectItem[];
  setProjects: (
    update: ProjectItem[] | ((prev: ProjectItem[]) => ProjectItem[]),
  ) => void;
  onSave: () => void;
  saving?: boolean;
  saved?: boolean;
};

const emptyProject = (): ProjectItem => ({
  id: generateId(),
  title: "Шинэ төсөл",
  category: "Усны төсөл",
  summary: "",
  details: "",
  price: 0,
  imageUrl: "",
  tags: [],
  isActive: true,
});

function tagText(project: ProjectItem) {
  return (project.tags || []).join(", ");
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
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
  const [uploadError, setUploadError] = useState("");

  const addProject = () => {
    setProjects((prev) => [emptyProject(), ...prev]);
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

  const removeProject = (id: string) => {
    if (!confirm("Энэ төслийг устгах уу?")) return;
    setProjects((prev) => prev.filter((project) => project.id !== id));
  };

  const updatePrice = (id: string, value: string) => {
    const digits = value.replace(/[^\d]/g, "");
    updateProject(id, "price", digits ? Number(digits) : 0);
  };

  const uploadProjectImage = async (
    id: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingProjectId(id);
    setUploadError("");
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
        throw new Error(data.message || "Зураг upload хийхэд алдаа гарлаа");
      updateProject(id, "imageUrl", data.url || "");
    } catch (error) {
      try {
        const fallback = await blobToDataUrl(
          await compressImage(file, 900, 0.72),
        );
        updateProject(id, "imageUrl", fallback);
        setUploadError("");
        return;
      } catch {
        // Keep the original server upload error visible if inline fallback also fails.
      }
      setUploadError(
        error instanceof Error
          ? error.message
          : "Зураг upload хийхэд алдаа гарлаа",
      );
    } finally {
      setUploadingProjectId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">
            Төсөл зарах хэсэг
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Web дээр төслийн хураангуй харагдаж, дэлгэрэнгүйг төлбөр төлсний
            дараа нээнэ.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addProject}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            Төсөл нэмэх
          </button>
          <button
            type="button"
            onClick={onSave}
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
            Одоогоор төсөл оруулаагүй байна.
          </p>
          <button
            type="button"
            onClick={addProject}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            Эхний төслийг нэмэх
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project, index) => (
            <article
              key={project.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">
                    Төсөл #{index + 1}
                  </p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">
                    {project.title || "Нэргүй төсөл"}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
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
                  <button
                    type="button"
                    onClick={() => removeProject(project.id)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
                    aria-label="Төсөл устгах"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Төслийн нэр
                  </span>
                  <input
                    value={project.title}
                    onChange={(e) =>
                      updateProject(project.id, "title", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    placeholder="Жишээ: Ус цэвэршүүлэх төсөл"
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
                    placeholder="Усны төсөл, Барилгын төсөл..."
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Дэлгэрэнгүй үзэх үнэ
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={project.price ? String(project.price) : ""}
                    onChange={(e) => updatePrice(project.id, e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    placeholder="50000"
                  />
                </label>
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Зураг URL
                  </span>
                  <div className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-2">
                    {project.imageUrl ? (
                      <img
                        src={project.imageUrl}
                        alt={project.title || "Project image"}
                        className="h-20 w-28 shrink-0 rounded-lg border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-slate-400">
                        <ImagePlus className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50">
                        {uploadingProjectId === project.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ImagePlus className="h-4 w-4" />
                        )}
                        {uploadingProjectId === project.id
                          ? "Оруулж байна..."
                          : " зураг сонгох"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingProjectId === project.id}
                          onChange={(e) => uploadProjectImage(project.id, e)}
                        />
                      </label>
                      {uploadError && uploadingProjectId === null && (
                        <p className="text-xs font-semibold text-red-500">
                          {uploadError}
                        </p>
                      )}
                    </div>
                  </div>
                  <input
                    value={project.imageUrl || ""}
                    onChange={(e) =>
                      updateProject(project.id, "imageUrl", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    placeholder="Upload хийсний дараа URL энд автоматаар орно"
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
                <label className="space-y-1.5 lg:col-span-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Дэлгэрэнгүй мэдээлэл
                  </span>
                  <textarea
                    value={project.details}
                    onChange={(e) =>
                      updateProject(project.id, "details", e.target.value)
                    }
                    rows={7}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    placeholder="Төлбөр төлсний дараа харагдах бүрэн мэдээлэл, тооцоо, хэрэгжилтийн төлөвлөгөө..."
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
