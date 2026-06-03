"use client";

import { useEffect, useRef, useState } from "react";
import { API, adminFetch } from "@/lib/api";

import {
  ProjectItem,
  ProjectPaymentAccount,
  ServiceCategory,
} from "@/lib/sections/types";

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

export function useSiteSettings() {
  const [banners, setBanners] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [mglServices, setMglServicesRaw] = useState<ServiceCategory[]>([]);
  const mglServicesRef = useRef<ServiceCategory[]>([]);
  const [franchiseProjects, setFranchiseProjectsRaw] = useState<ProjectItem[]>(
    [],
  );
  const franchiseProjectsRef = useRef<ProjectItem[]>([]);
  const [projects, setProjectsRaw] = useState<ProjectItem[]>([]);
  const projectsRef = useRef<ProjectItem[]>([]);
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

  const setProjects = (
    update: ProjectItem[] | ((prev: ProjectItem[]) => ProjectItem[]),
  ) => {
    setProjectsRaw((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      projectsRef.current = next;
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

        if (data["site-projects"]) {
          try {
            const parsed = JSON.parse(data["site-projects"]);
            if (Array.isArray(parsed)) {
              const normalized = parsed.map(normalizeProjectImages);
              setProjectsRaw(normalized);
              projectsRef.current = normalized;
            }
          } catch {}
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

  const saveProjectList = async (
    key: "paid-projects" | "site-projects",
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
      alert(
        error instanceof Error
          ? error.message
          : errorMessage,
      );
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

  const saveProjects = async (currentProjects?: ProjectItem[]) =>
    saveProjectList(
      "site-projects",
      currentProjects,
      projectsRef,
      "Төсөл хадгалахад алдаа гарлаа",
    );

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
    franchiseProjects,
    setFranchiseProjects,
    projects,
    setProjects,
    projectPaymentAccounts,
    showBranchMapOnWeb,
    saving,
    saved,
    branchMapVisibilitySaving,
    saveBanners,
    saveCategories,
    saveMglServices,
    saveFranchiseProjects,
    saveProjects,
    toggleBranchMapOnWeb,
  };
}
