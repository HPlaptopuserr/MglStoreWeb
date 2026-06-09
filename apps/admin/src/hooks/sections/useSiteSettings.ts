"use client";

import { useEffect, useRef, useState } from "react";
import { API, adminFetch } from "@/lib/api";

import {
  ProjectItem,
  ProjectPaymentAccount,
  ProjectShowcaseSection,
  ServiceCategory,
  StudySectionSettings,
  SurveySectionSettings,
} from "@/lib/sections/types";

const DEFAULT_SURVEY_SETTINGS: SurveySectionSettings = {
  enabled: false,
  title: "Судалгаа",
  eyebrow: "Survey",
  description:
    "Богино асуулгад оролцож, MGL Store-ийн үйлчилгээний чанарыг сайжруулахад туслаарай.",
  formSlug: "",
  formTitle: "",
  actionLabel: "Судалгаа бөглөх",
};

const DEFAULT_STUDY_SETTINGS: StudySectionSettings = {
  eyebrow: "Training access",
  title: "Сургалт",
  accentTitle: "бүртгэл",
  description:
    "MGL Store-ийн сургалт, зөвлөмж болон хэрэгжүүлэх алхмуудтай танилцаад шууд бүртгүүлж төлбөрөө баталгаажуулна уу.",
  countLabel: "сургалт",
  secondaryPillLabel: "Бүртгэл + төлбөр",
  listEyebrow: "Available trainings",
  listTitle: "Бүртгүүлэх сургалтууд",
  emptyText: "Одоогоор бүртгэлтэй сургалт нэмэгдээгүй байна.",
  bannerUrl: "",
};

function normalizeProjectImages(project: ProjectItem): ProjectItem {
  const imageUrls = Array.from(
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

  return {
    ...project,
    price:
      Number.isFinite(Number(project.price)) && Number(project.price) > 0
        ? Math.round(Number(project.price))
        : 0,
    imageUrl: imageUrls[0] ?? "",
    imageUrls,
    isFeatured: Boolean(project.isFeatured),
  };
}

function parseProjectPaymentAccounts(raw?: string): ProjectPaymentAccount[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((account) => ({
        id: String(account?.id || "").trim(),
        label: String(account?.label || "").trim(),
        merchantName: String(account?.merchantName || "").trim(),
        merchantCode: String(account?.merchantCode || "").trim(),
        bankCode: String(account?.bankCode || "").trim(),
        accountNumber: String(account?.accountNumber || "").trim(),
      }))
      .filter((account) => account.id && account.merchantCode);
  } catch {
    return [];
  }
}

function normalizeProjectShowcaseSection(
  section: ProjectShowcaseSection,
): ProjectShowcaseSection {
  return {
    id:
      String(section.id || "").trim() ||
      Math.random().toString(36).slice(2, 10),
    title: String(section.title || "").trim() || "Төслийн хэсэг",
    subtitle: String(section.subtitle || "").trim(),
    projectIds: Array.from(
      new Set(
        (Array.isArray(section.projectIds) ? section.projectIds : [])
          .map((id) => String(id || "").trim())
          .filter(Boolean),
      ),
    ),
  };
}

function normalizeStudySettings(raw: unknown): StudySectionSettings {
  const parsed = raw && typeof raw === "object" ? raw : {};
  const record = parsed as Partial<StudySectionSettings>;
  const clean = (value: unknown, fallback: string) => {
    const text = String(value || "").trim();
    if (
      !text ||
      /PDF материал|материалууд|материал$|All training materials|Бүх сургалтын материал|Admin-аас удирдана/i.test(
        text,
      )
    ) {
      return fallback;
    }
    return text;
  };
  return {
    eyebrow: clean(record.eyebrow, DEFAULT_STUDY_SETTINGS.eyebrow),
    title: clean(record.title, DEFAULT_STUDY_SETTINGS.title),
    accentTitle: clean(record.accentTitle, DEFAULT_STUDY_SETTINGS.accentTitle),
    description: clean(record.description, DEFAULT_STUDY_SETTINGS.description),
    countLabel: clean(record.countLabel, DEFAULT_STUDY_SETTINGS.countLabel),
    secondaryPillLabel: clean(
      record.secondaryPillLabel,
      DEFAULT_STUDY_SETTINGS.secondaryPillLabel,
    ),
    listEyebrow: clean(record.listEyebrow, DEFAULT_STUDY_SETTINGS.listEyebrow),
    listTitle: clean(record.listTitle, DEFAULT_STUDY_SETTINGS.listTitle),
    emptyText: clean(record.emptyText, DEFAULT_STUDY_SETTINGS.emptyText),
    bannerUrl: String(record.bannerUrl || ""),
  };
}

export function useSiteSettings() {
  const [banners, setBanners] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [mglServices, setMglServicesRaw] = useState<ServiceCategory[]>([]);
  const mglServicesRef = useRef<ServiceCategory[]>([]);
  const [hrServices, setHrServicesRaw] = useState<ServiceCategory[]>([]);
  const hrServicesRef = useRef<ServiceCategory[]>([]);
  const [surveySettings, setSurveySettingsRaw] =
    useState<SurveySectionSettings>(DEFAULT_SURVEY_SETTINGS);
  const surveySettingsRef = useRef<SurveySectionSettings>(
    DEFAULT_SURVEY_SETTINGS,
  );
  const [franchiseProjects, setFranchiseProjectsRaw] = useState<ProjectItem[]>(
    [],
  );
  const franchiseProjectsRef = useRef<ProjectItem[]>([]);
  const [projects, setProjectsRaw] = useState<ProjectItem[]>([]);
  const projectsRef = useRef<ProjectItem[]>([]);
  const [studyProjects, setStudyProjectsRaw] = useState<ProjectItem[]>([]);
  const studyProjectsRef = useRef<ProjectItem[]>([]);
  const [studySettings, setStudySettingsRaw] = useState<StudySectionSettings>(
    DEFAULT_STUDY_SETTINGS,
  );
  const studySettingsRef = useRef<StudySectionSettings>(DEFAULT_STUDY_SETTINGS);
  const [projectShowcaseSections, setProjectShowcaseSectionsRaw] = useState<
    ProjectShowcaseSection[]
  >([]);
  const projectShowcaseSectionsRef = useRef<ProjectShowcaseSection[]>([]);
  const [projectPaymentAccounts, setProjectPaymentAccounts] = useState<
    ProjectPaymentAccount[]
  >([]);

  const setMglServices = (
    update:
      | ServiceCategory[]
      | ((prev: ServiceCategory[]) => ServiceCategory[]),
  ) => {
    setMglServicesRaw((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      mglServicesRef.current = next;
      return next;
    });
  };

  const setHrServices = (
    update:
      | ServiceCategory[]
      | ((prev: ServiceCategory[]) => ServiceCategory[]),
  ) => {
    setHrServicesRaw((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      hrServicesRef.current = next;
      return next;
    });
  };

  const setSurveySettings = (
    update:
      | SurveySectionSettings
      | ((prev: SurveySectionSettings) => SurveySectionSettings),
  ) => {
    setSurveySettingsRaw((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      surveySettingsRef.current = next;
      return next;
    });
  };

  const setProjects = (
    update: ProjectItem[] | ((prev: ProjectItem[]) => ProjectItem[]),
  ) => {
    setProjectsRaw((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      projectsRef.current = next;
      return next;
    });
  };

  const setStudyProjects = (
    update: ProjectItem[] | ((prev: ProjectItem[]) => ProjectItem[]),
  ) => {
    setStudyProjectsRaw((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      studyProjectsRef.current = next;
      return next;
    });
  };

  const setStudySettings = (
    update:
      | StudySectionSettings
      | ((prev: StudySectionSettings) => StudySectionSettings),
  ) => {
    setStudySettingsRaw((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      studySettingsRef.current = next;
      return next;
    });
  };

  const setProjectShowcaseSections = (
    update:
      | ProjectShowcaseSection[]
      | ((prev: ProjectShowcaseSection[]) => ProjectShowcaseSection[]),
  ) => {
    setProjectShowcaseSectionsRaw((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      projectShowcaseSectionsRef.current = next;
      return next;
    });
  };

  const setFranchiseProjects = (
    update: ProjectItem[] | ((prev: ProjectItem[]) => ProjectItem[]),
  ) => {
    setFranchiseProjectsRaw((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      franchiseProjectsRef.current = next;
      return next;
    });
  };
  const [showBranchMapOnWeb, setShowBranchMapOnWeb] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [branchMapVisibilitySaving, setBranchMapVisibilitySaving] =
    useState(false);

  useEffect(() => {
    adminFetch(`${API}/site-settings/admin`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, string>) => {
        if (data["promo-banners"]) {
          try {
            const parsed = JSON.parse(data["promo-banners"]);
            if (Array.isArray(parsed)) setBanners(parsed);
          } catch {}
        } else if (data["promo-banner"]) {
          setBanners([data["promo-banner"]]);
        }

        if (data["home-categories"]) {
          try {
            const parsed = JSON.parse(data["home-categories"]);
            if (Array.isArray(parsed)) setCategories(parsed);
          } catch {}
        }

        if (data["mgl-services"]) {
          try {
            const parsed = JSON.parse(data["mgl-services"]);
            if (Array.isArray(parsed)) {
              setMglServicesRaw(parsed);
              mglServicesRef.current = parsed;
            }
          } catch {}
        }

        if (data["hr-services"]) {
          try {
            const parsed = JSON.parse(data["hr-services"]);
            if (Array.isArray(parsed)) {
              setHrServicesRaw(parsed);
              hrServicesRef.current = parsed;
            }
          } catch {}
        }

        if (data["survey-section"]) {
          try {
            const parsed = JSON.parse(data["survey-section"]);
            const next = {
              ...DEFAULT_SURVEY_SETTINGS,
              ...(parsed && typeof parsed === "object" ? parsed : {}),
              enabled: Boolean(parsed?.enabled),
              title: String(parsed?.title || DEFAULT_SURVEY_SETTINGS.title),
              eyebrow: String(
                parsed?.eyebrow || DEFAULT_SURVEY_SETTINGS.eyebrow,
              ),
              description: String(
                parsed?.description || DEFAULT_SURVEY_SETTINGS.description,
              ),
              formSlug: String(parsed?.formSlug || ""),
              formTitle: String(parsed?.formTitle || ""),
              actionLabel: String(
                parsed?.actionLabel || DEFAULT_SURVEY_SETTINGS.actionLabel,
              ),
            };
            setSurveySettingsRaw(next);
            surveySettingsRef.current = next;
          } catch {}
        }

        if (data["paid-projects"]) {
          try {
            const parsed = JSON.parse(data["paid-projects"]);
            if (Array.isArray(parsed)) {
              const normalized = parsed.map(normalizeProjectImages);
              setFranchiseProjectsRaw(normalized);
              franchiseProjectsRef.current = normalized;
            }
          } catch {}
        }

        if (data["site-study"]) {
          try {
            const parsed = JSON.parse(data["site-study"]);
            if (Array.isArray(parsed)) {
              const normalized = parsed.map(normalizeProjectImages);
              setStudyProjectsRaw(normalized);
              studyProjectsRef.current = normalized;
            }
          } catch {}
        } else {
          setStudyProjectsRaw([]);
          studyProjectsRef.current = [];
        }

        if (data["site-study-settings"]) {
          try {
            const parsed = JSON.parse(data["site-study-settings"]);
            const normalized = normalizeStudySettings(parsed);
            setStudySettingsRaw(normalized);
            studySettingsRef.current = normalized;
          } catch {}
        }

        let normalizedProjects: ProjectItem[] = [];
        if (data["site-projects"]) {
          try {
            const parsed = JSON.parse(data["site-projects"]);
            if (Array.isArray(parsed)) {
              const normalized = parsed.map(normalizeProjectImages);
              normalizedProjects = normalized;
              setProjectsRaw(normalized);
              projectsRef.current = normalized;
            }
          } catch {}
        }

        if (data["site-project-showcases"]) {
          try {
            const parsed = JSON.parse(data["site-project-showcases"]);
            if (Array.isArray(parsed)) {
              const normalized = parsed.map(normalizeProjectShowcaseSection);
              setProjectShowcaseSectionsRaw(normalized);
              projectShowcaseSectionsRef.current = normalized;
            }
          } catch {}
        } else {
          const featuredIds = normalizedProjects
            .filter((project) => project.isFeatured)
            .map((project) => project.id);
          if (featuredIds.length > 0) {
            const fallback = [
              {
                id: "default-featured-projects",
                title: "Төслийн онцлох хэсэг",
                subtitle: "Admin-аас сонгосон төслүүд",
                projectIds: featuredIds,
              },
            ];
            setProjectShowcaseSectionsRaw(fallback);
            projectShowcaseSectionsRef.current = fallback;
          }
        }

        setProjectPaymentAccounts(
          parseProjectPaymentAccounts(data["contract-payment-accounts"]),
        );

        const showMapRaw = data["show-branch-map"];
        setShowBranchMapOnWeb(
          showMapRaw === "true" || showMapRaw === "1" || showMapRaw === "on",
        );
      })
      .catch(() => {});
  }, []);

  const saveBanners = async (currentBanners: string[]) => {
    setSaving(true);
    try {
      await adminFetch(`${API}/site-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "promo-banners": JSON.stringify(currentBanners),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
    setSaving(false);
  };

  const saveCategories = async (currentCategories: string[]) => {
    setSaving(true);
    try {
      await adminFetch(`${API}/site-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "home-categories": JSON.stringify(currentCategories),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
    setSaving(false);
  };

  const saveMglServices = async (currentServices?: ServiceCategory[]) => {
    // Always use the ref to get the latest value, avoiding stale closures
    const toSave = currentServices ?? mglServicesRef.current;
    setSaving(true);
    try {
      await adminFetch(`${API}/site-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "mgl-services": JSON.stringify(toSave) }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
    setSaving(false);
  };

  const saveHrServices = async (currentServices?: ServiceCategory[]) => {
    const toSave = currentServices ?? hrServicesRef.current;
    setSaving(true);
    try {
      await adminFetch(`${API}/site-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "hr-services": JSON.stringify(toSave) }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
    setSaving(false);
  };

  const saveSurveySettings = async (
    currentSettings?: SurveySectionSettings,
  ) => {
    const toSave = currentSettings ?? surveySettingsRef.current;
    setSaving(true);
    try {
      await adminFetch(`${API}/site-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "survey-section": JSON.stringify(toSave) }),
      });
      surveySettingsRef.current = toSave;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      return true;
    } catch {
      alert("Судалгааны тохиргоо хадгалахад алдаа гарлаа");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveProjectList = async (
    key: "paid-projects" | "site-projects" | "site-study",
    currentProjects: ProjectItem[] | undefined,
    fallbackRef: { current: ProjectItem[] },
    errorMessage: string,
  ) => {
    const toSave = (currentProjects ?? fallbackRef.current).map(
      normalizeProjectImages,
    );
    setSaving(true);
    try {
      const res = await adminFetch(`${API}/site-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: JSON.stringify(toSave) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || errorMessage);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      return true;
    } catch (error) {
      alert(error instanceof Error ? error.message : errorMessage);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveFranchiseProjects = async (currentProjects?: ProjectItem[]) =>
    saveProjectList(
      "paid-projects",
      currentProjects,
      franchiseProjectsRef,
      "Franchise хадгалахад алдаа гарлаа",
    );

  const saveStudyProjects = async (currentProjects?: ProjectItem[]) =>
    saveProjectList(
      "site-study",
      currentProjects,
      studyProjectsRef,
      "Сургалтын материал хадгалахад алдаа гарлаа",
    );

  const saveStudyPage = async (
    currentProjects?: ProjectItem[],
    currentSettings?: StudySectionSettings,
  ) => {
    const projectsToSave = (currentProjects ?? studyProjectsRef.current).map(
      normalizeProjectImages,
    );
    const settingsToSave = normalizeStudySettings(
      currentSettings ?? studySettingsRef.current,
    );

    setSaving(true);
    try {
      const res = await adminFetch(`${API}/site-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "site-study": JSON.stringify(projectsToSave),
          "site-study-settings": JSON.stringify(settingsToSave),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || "Сургалтын page хадгалахад алдаа гарлаа",
        );
      }
      studyProjectsRef.current = projectsToSave;
      studySettingsRef.current = settingsToSave;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      return true;
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Сургалтын page хадгалахад алдаа гарлаа",
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveProjects = async (
    currentProjects?: ProjectItem[],
    currentShowcaseSections?: ProjectShowcaseSection[],
  ) => {
    const projectsToSave = (currentProjects ?? projectsRef.current).map(
      normalizeProjectImages,
    );
    const showcaseSectionsToSave = (
      currentShowcaseSections ?? projectShowcaseSectionsRef.current
    ).map(normalizeProjectShowcaseSection);

    setSaving(true);
    try {
      const res = await adminFetch(`${API}/site-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "site-projects": JSON.stringify(projectsToSave),
          "site-project-showcases": JSON.stringify(showcaseSectionsToSave),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Төсөл хадгалахад алдаа гарлаа");
      }
      projectsRef.current = projectsToSave;
      projectShowcaseSectionsRef.current = showcaseSectionsToSave;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      return true;
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Төсөл хадгалахад алдаа гарлаа",
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleBranchMapOnWeb = async () => {
    const nextValue = !showBranchMapOnWeb;
    setShowBranchMapOnWeb(nextValue);
    setBranchMapVisibilitySaving(true);
    try {
      const res = await adminFetch(`${API}/site-settings/show-branch-map`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: nextValue ? "true" : "false" }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setShowBranchMapOnWeb(!nextValue);
      alert("Салбарын map-ийн төлвийг хадгалах үед алдаа гарлаа");
    } finally {
      setBranchMapVisibilitySaving(false);
    }
  };

  return {
    banners,
    setBanners,
    categories,
    setCategories,
    mglServices,
    setMglServices,
    hrServices,
    setHrServices,
    surveySettings,
    setSurveySettings,
    franchiseProjects,
    setFranchiseProjects,
    projects,
    setProjects,
    studyProjects,
    setStudyProjects,
    studySettings,
    setStudySettings,
    projectShowcaseSections,
    setProjectShowcaseSections,
    projectPaymentAccounts,
    showBranchMapOnWeb,
    saving,
    saved,
    branchMapVisibilitySaving,
    saveBanners,
    saveCategories,
    saveMglServices,
    saveHrServices,
    saveSurveySettings,
    saveFranchiseProjects,
    saveStudyProjects,
    saveStudyPage,
    saveProjects,
    toggleBranchMapOnWeb,
  };
}
