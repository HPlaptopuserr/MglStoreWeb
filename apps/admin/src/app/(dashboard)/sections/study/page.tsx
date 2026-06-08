"use client";

import { useState, type ChangeEvent } from "react";
import {
  BookOpenCheck,
  ExternalLink,
  ImagePlus,
  Layers3,
  Loader2,
} from "lucide-react";
import { useSiteSettings } from "@/hooks/sections/useSiteSettings";
import { ProjectsSection } from "@/components/organisms/sections/projects/ProjectsSection";
import { API, adminFetch } from "@/lib/api";
import type { StudySectionSettings } from "@/lib/sections/types";
import { SectionsRouteFrame } from "../_components/SectionsRouteFrame";
import { SectionContent } from "../_components/SectionContent";

function uploadErrorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  const record = data as Record<string, unknown>;
  const message = typeof record.message === "string" ? record.message : "";
  const detail = typeof record.detail === "string" ? record.detail : "";
  return [message, detail].filter(Boolean).join(": ") || fallback;
}

function StudyBannerEditor({
  settings,
  setSettings,
}: {
  settings: StudySectionSettings;
  setSettings: (
    update:
      | StudySectionSettings
      | ((prev: StudySectionSettings) => StudySectionSettings),
  ) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const updateField = <K extends keyof StudySectionSettings>(
    field: K,
    value: StudySectionSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const uploadBanner = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await adminFetch(`${API}/site-settings/banner-upload`, {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          uploadErrorMessage(data, "Banner зураг upload хийхэд алдаа гарлаа"),
        );
      }
      if (typeof data.url !== "string" || !data.url) {
        throw new Error("Зургийн URL серверээс ирсэнгүй");
      }
      updateField("bannerUrl", data.url);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Banner зураг upload хийхэд алдаа гарлаа",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
            Study page settings
          </p>
          <h2 className="mt-2 text-xl font-black text-slate-950">
            /study page-ийн дээд хэсэг
          </h2>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            Web дээрх сургалтын hero, хайлтын хэсэг, тоон badge болон хоосон үед
            харагдах текстийг эндээс удирдана.
          </p>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Жижиг дээд гарчиг
              </span>
              <input
                value={settings.eyebrow}
                onChange={(event) => updateField("eyebrow", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                placeholder="Training access"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Гарчиг
              </span>
              <input
                value={settings.title}
                onChange={(event) => updateField("title", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                placeholder="Сургалт"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Улбар өнгөөр тодрох үг
              </span>
              <input
                value={settings.accentTitle}
                onChange={(event) =>
                  updateField("accentTitle", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                placeholder="бүртгэл / материал"
              />
            </label>
            <label className="space-y-1.5 lg:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Hero тайлбар
              </span>
              <textarea
                value={settings.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                placeholder="Сургалтын page дээр харагдах богино тайлбар..."
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Сургалтын тооны label
              </span>
              <input
                value={settings.countLabel}
                onChange={(event) =>
                  updateField("countLabel", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                placeholder="сургалт"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Хоёр дахь badge text
              </span>
              <input
                value={settings.secondaryPillLabel}
                onChange={(event) =>
                  updateField("secondaryPillLabel", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                placeholder="Бүртгэл + төлбөр"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Сургалтын grid-ийн жижиг гарчиг
              </span>
              <input
                value={settings.listEyebrow}
                onChange={(event) =>
                  updateField("listEyebrow", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                placeholder="Available trainings"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Сургалтын grid-ийн гарчиг
              </span>
              <input
                value={settings.listTitle}
                onChange={(event) =>
                  updateField("listTitle", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                placeholder="Бүртгүүлэх сургалтууд"
              />
            </label>
            <label className="space-y-1.5 lg:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Сургалт байхгүй үед харагдах text
              </span>
              <input
                value={settings.emptyText}
                onChange={(event) =>
                  updateField("emptyText", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                placeholder="Одоогоор бүртгэлтэй сургалт нэмэгдээгүй байна."
              />
            </label>
            <label className="space-y-1.5 lg:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Hero banner зургийн URL
              </span>
              <input
                value={settings.bannerUrl}
                onChange={(event) =>
                  updateField("bannerUrl", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                placeholder="Upload хийвэл URL автоматаар орно"
              />
            </label>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50 p-5 xl:border-l xl:border-t-0">
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {settings.bannerUrl ? (
              <img
                src={settings.bannerUrl}
                alt="Сургалтын banner"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-emerald-50 text-emerald-500">
                <ImagePlus className="h-12 w-12" />
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-500">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
              {uploading ? "Upload хийж байна..." : "Banner upload"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={uploadBanner}
              />
            </label>
            {settings.bannerUrl && (
              <button
                type="button"
                onClick={() => updateField("bannerUrl", "")}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
              >
                Арилгах
              </button>
            )}
          </div>
          {uploadError && (
            <p className="mt-2 text-xs font-semibold text-red-500">
              {uploadError}
            </p>
          )}

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                  Web preview
                </p>
                <h3 className="mt-1 text-sm font-black text-slate-950">
                  /study дээр харагдах hero
                </h3>
              </div>
              <a
                href="http://localhost:3000/study"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
              >
                Нээх
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">
                <span className="h-px w-6 bg-orange-400" />
                {settings.eyebrow || "Training access"}
              </div>
              <h4 className="mt-3 text-2xl font-black leading-tight text-slate-950">
                {settings.title || "Сургалт"}{" "}
                <span className="font-serif text-orange-500">
                  {settings.accentTitle || "материалууд"}
                </span>
              </h4>
              <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-slate-500">
                {settings.description ||
                  "Сургалтын page дээр харагдах богино тайлбар..."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                  <BookOpenCheck className="h-3.5 w-3.5" />0{" "}
                  {settings.countLabel || "материал"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1.5 text-xs font-black text-cyan-700">
                  <Layers3 className="h-3.5 w-3.5" />
                  {settings.secondaryPillLabel || "Admin-аас удирдана"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function StudySectionPage() {
  const {
    studyProjects,
    setStudyProjects,
    studySettings,
    setStudySettings,
    projectPaymentAccounts,
    saving,
    saved,
    saveStudyPage,
  } = useSiteSettings();

  return (
    <SectionsRouteFrame
      active="study"
      onSave={() => void saveStudyPage(studyProjects, studySettings)}
      saving={saving}
      saved={saved}
    >
      <SectionContent>
        <StudyBannerEditor
          settings={studySettings}
          setSettings={setStudySettings}
        />
        <ProjectsSection
          mode="study"
          projects={studyProjects}
          paymentAccounts={projectPaymentAccounts}
          setProjects={setStudyProjects}
          onSave={(currentProjects) =>
            saveStudyPage(currentProjects, studySettings)
          }
          saving={saving}
          saved={saved}
        />
      </SectionContent>
    </SectionsRouteFrame>
  );
}
